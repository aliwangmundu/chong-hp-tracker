import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import OBR, { type Item, type Metadata } from "@owlbear-rodeo/sdk";
import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import {
  isTrackableItem,
  parseTokens,
  statPatch,
  withStat,
  writeStats,
  writeStatsBatch,
} from "@/core/metadata";
import { parseSettings, setHideAdversaries } from "@/core/settings";
import { type GroupedTokens, groupByCategory, moveToken } from "@/core/sorting";
import {
  CATEGORIES,
  type NumericStatKey,
  type TrackedToken,
} from "@/core/types";
import CategorySection, { categoryFromDroppableId } from "./CategorySection";
import HideToggle from "./HideToggle";
import TokenDrawer, { DETAIL_WIDTH } from "./TokenDrawer";

/**
 * Popover width with only the token list showing.
 *
 * This is the authority — the effect below sets it on every close, so the
 * matching `action.width` in manifest.json only governs the very first frame.
 * Keep the two the same anyway, or the panel visibly jumps the first time a
 * card is closed.
 */
const PANEL_WIDTH = 288;

export default function App() {
  const [tokens, setTokens] = useState<TrackedToken[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [sceneReady, setSceneReady] = useState(false);
  const [isGm, setIsGm] = useState(false);
  const [adversariesHidden, setAdversariesHidden] = useState(false);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  /** Set while a drag is being written, so the scene echo cannot flicker. */
  const [pendingGroups, setPendingGroups] = useState<GroupedTokens | null>(null);

  // Scene tokens
  useEffect(() => {
    const update = (items: Item[]) => {
      setTokens(parseTokens(items));
      setPendingGroups(null);
    };

    const handleReady = (ready: boolean) => {
      setSceneReady(ready);
      if (ready) {
        void OBR.scene.items.getItems(isTrackableItem).then(update);
      } else {
        setTokens([]);
      }
    };

    void OBR.scene.isReady().then(handleReady);
    const unsubscribeReady = OBR.scene.onReadyChange(handleReady);
    const unsubscribeItems = OBR.scene.items.onChange(update);

    return () => {
      unsubscribeReady();
      unsubscribeItems();
    };
  }, []);

  // Selection highlight and role
  useEffect(() => {
    void OBR.player.getSelection().then((ids) => setSelection(ids ?? []));
    void OBR.player.getRole().then((role) => setIsGm(role === "GM"));
    return OBR.player.onChange((player) => {
      setSelection(player.selection ?? []);
      setIsGm(player.role === "GM");
    });
  }, []);

  // Scene settings — shared by everyone in the room
  useEffect(() => {
    if (!sceneReady) return;
    const apply = (metadata: Metadata) => {
      setAdversariesHidden(parseSettings(metadata).hideAdversaries);
    };
    void OBR.scene.getMetadata().then(apply);
    return OBR.scene.onMetadataChange(apply);
  }, [sceneReady]);

  // Follow the Owlbear theme
  useEffect(() => {
    const apply = (mode: "DARK" | "LIGHT") => {
      document.documentElement.classList.toggle("dark", mode === "DARK");
    };
    void OBR.theme.getTheme().then((theme) => apply(theme.mode));
    return OBR.theme.onChange((theme) => apply(theme.mode));
  }, []);

  const groups = useMemo(
    () => pendingGroups ?? groupByCategory(tokens),
    [pendingGroups, tokens],
  );

  /**
   * The GM always sees adversaries; the switch only takes them off everyone
   * else's panel. Bubbles on the tokens are untouched either way.
   */
  const visibleCategories = useMemo(
    () =>
      CATEGORIES.filter(
        (category) =>
          category !== "ADVERSARY" || isGm || !adversariesHidden,
      ),
    [adversariesHidden, isGm],
  );

  const visibleTokenCount = useMemo(
    () =>
      visibleCategories.reduce(
        (total, category) => total + groups[category].length,
        0,
      ),
    [groups, visibleCategories],
  );

  const toggleAdversariesHidden = useCallback(() => {
    const next = !adversariesHidden;
    setAdversariesHidden(next); // optimistic; the scene echo confirms it
    void setHideAdversaries(next).catch(() => setAdversariesHidden(!next));
  }, [adversariesHidden]);

  const handleStatChange = useCallback(
    (id: string, key: NumericStatKey, value: number) => {
      // Optimistic: the field should settle instantly, not after a round trip.
      setTokens((current) =>
        current.map((token) =>
          token.id === id
            ? { ...token, stats: withStat(token.stats, key, value) }
            : token,
        ),
      );
      void writeStats(id, statPatch(key, value));
    },
    [],
  );

  const handleAcChange = useCallback((id: string, value: string) => {
    setTokens((current) =>
      current.map((token) =>
        token.id === id
          ? { ...token, stats: { ...token.stats, ac: value } }
          : token,
      ),
    );
    void writeStats(id, { ac: value });
  }, []);

  // A token deleted from the scene must not leave its drawer open over nothing.
  const detailsToken = useMemo(
    () => tokens.find((token) => token.id === detailsFor) ?? null,
    [detailsFor, tokens],
  );

  const detailsOpen = detailsToken !== null;

  /**
   * Grow the popover rather than covering the list.
   *
   * Owlbear sizes the popover from the manifest, but an extension can resize
   * its own. Widening by exactly the card's width puts the second window
   * beside the first, and pinning the list to PANEL_WIDTH below means it does
   * not reflow by a single pixel when that happens.
   */
  useEffect(() => {
    void OBR.action.setWidth(
      detailsOpen ? PANEL_WIDTH + DETAIL_WIDTH : PANEL_WIDTH,
    );
  }, [detailsOpen]);

  /** The row's `+` is a toggle: same token closes, a different one switches. */
  const toggleDetails = useCallback((id: string) => {
    setDetailsFor((current) => (current === id ? null : id));
  }, []);

  // The token was deleted from the scene while its card was open.
  useEffect(() => {
    if (detailsFor !== null && detailsToken === null) setDetailsFor(null);
  }, [detailsFor, detailsToken]);

  /**
   * Rows beat sections.
   *
   * A category section is a large droppable, so plain closestCenter will often
   * pick it over the row the pointer is actually on and every drop would land
   * at the end of the list.
   */
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const under = pointerWithin(args);
    const rows = under.filter(
      (collision) => !String(collision.id).startsWith("category:"),
    );
    if (rows.length > 0) return rows;
    if (under.length > 0) return under;
    return closestCenter(args);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Enough travel that clicking into a stat field never starts a drag.
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over === null) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      const asCategory = categoryFromDroppableId(overId);
      let targetCategory = asCategory;
      let targetIndex = 0;

      if (asCategory !== undefined) {
        // Dropped on the section itself: append.
        targetIndex = groups[asCategory].length;
      } else {
        for (const category of CATEGORIES) {
          const index = groups[category].findIndex(
            (token) => token.id === overId,
          );
          if (index !== -1) {
            targetCategory = category;
            targetIndex = index;
            break;
          }
        }
      }

      if (targetCategory === undefined) return;

      const { groups: next, patches } = moveToken(
        groups,
        activeId,
        targetCategory,
        targetIndex,
      );
      if (patches.size === 0) return;

      setPendingGroups(next);
      void writeStatsBatch(patches).catch(() => setPendingGroups(null));
    },
    [groups],
  );

  return (
    <div className="app-surface flex h-full overflow-hidden">
      <main
        className="h-full shrink-0 overflow-y-auto overflow-x-hidden px-2 pb-4 pt-1"
        style={{ width: PANEL_WIDTH }}
      >
        {!sceneReady ? (
          <Placeholder>Open a scene to start tracking.</Placeholder>
        ) : visibleTokenCount === 0 ? (
          <Placeholder>
            Drop a token on the map and it will show up here.
          </Placeholder>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            modifiers={[restrictToFirstScrollableAncestor]}
            onDragEnd={handleDragEnd}
          >
            {visibleCategories.map((category) => (
              <CategorySection
                key={category}
                category={category}
                tokens={groups[category]}
                selection={selection}
                onStatChange={handleStatChange}
                onAcChange={handleAcChange}
                onToggleDetails={toggleDetails}
                openDetailsId={detailsFor}
                headerAction={
                  category === "ADVERSARY" && isGm ? (
                    <HideToggle
                      hidden={adversariesHidden}
                      onToggle={toggleAdversariesHidden}
                    />
                  ) : undefined
                }
              />
            ))}
          </DndContext>
        )}
      </main>

      {detailsToken !== null && (
        <TokenDrawer token={detailsToken} onStatChange={handleStatChange} />
      )}
    </div>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 py-8 text-center text-sm text-ink-400 dark:text-ink-600">
      {children}
    </p>
  );
}
