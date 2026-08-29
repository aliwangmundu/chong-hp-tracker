import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import OBR, { type Item, type Metadata } from "@owlbear-rodeo/sdk";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { stepDurations } from "@/core/entries";
import {
  moveRecord,
  newRecord,
  parseRecords,
  releaseToken,
  statPatch,
  withRecord,
  withoutRecord,
} from "@/core/records";
import { updateRecords } from "@/core/recordStore";
import { FIRST_ROUND, parseSettings, setRound } from "@/core/settings";
import { indexTokens, isAssignableItem } from "@/core/tokens";
import type {
  AssignableToken,
  Condition,
  NumericStatKey,
  Resource,
  TrackedRecord,
} from "@/core/types";
import RecordDrawer, { DETAIL_WIDTH } from "./RecordDrawer";
import RecordRow from "./RecordRow";
import RoundBar from "./RoundBar";

/**
 * Popover width with only the record list showing.
 *
 * This is the authority — the effect below sets it on every close, so the
 * matching `action.width` in manifest.json only governs the very first frame.
 */
const PANEL_WIDTH = 288;

export default function App() {
  const [records, setRecords] = useState<TrackedRecord[]>([]);
  const [tokens, setTokens] = useState(new Map<string, AssignableToken>());
  const [selection, setSelection] = useState<string[]>([]);
  const [sceneReady, setSceneReady] = useState(false);
  const [isGm, setIsGm] = useState(false);
  const [round, setRoundState] = useState(FIRST_ROUND);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);

  // Scene tokens — only for linking, thumbnails and names.
  useEffect(() => {
    const update = (items: Item[]) => setTokens(indexTokens(items));

    const handleReady = (ready: boolean) => {
      setSceneReady(ready);
      if (ready) {
        void OBR.scene.items.getItems(isAssignableItem).then(update);
      } else {
        setTokens(new Map());
        setRecords([]);
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

  // Records and settings both live in scene metadata.
  useEffect(() => {
    if (!sceneReady) return;
    const apply = (metadata: Metadata) => {
      setRecords(parseRecords(metadata));
      setRoundState(parseSettings(metadata).round);
    };
    void OBR.scene.getMetadata().then(apply);
    return OBR.scene.onMetadataChange(apply);
  }, [sceneReady]);

  useEffect(() => {
    void OBR.player.getSelection().then((ids) => setSelection(ids ?? []));
    void OBR.player.getRole().then((role) => setIsGm(role === "GM"));
    return OBR.player.onChange((player) => {
      setSelection(player.selection ?? []);
      setIsGm(player.role === "GM");
    });
  }, []);

  useEffect(() => {
    const apply = (mode: "DARK" | "LIGHT") => {
      document.documentElement.classList.toggle("dark", mode === "DARK");
    };
    void OBR.theme.getTheme().then((theme) => apply(theme.mode));
    return OBR.theme.onChange((theme) => apply(theme.mode));
  }, []);

  /** Hidden records stay on the GM's panel and vanish from everyone else's. */
  const visible = useMemo(
    () => (isGm ? records : records.filter((record) => !record.hidden)),
    [isGm, records],
  );

  /**
   * Optimistic write.
   *
   * The panel shows the change at once, then the scene write goes out built
   * from the live metadata rather than this local copy — so two people editing
   * different records do not overwrite each other.
   */
  const edit = useCallback(
    (mutate: (records: TrackedRecord[]) => TrackedRecord[]) => {
      setRecords(mutate);
      void updateRecords(mutate);
    },
    [],
  );

  const addRecord = useCallback(() => {
    const record = newRecord();
    edit((current) => [...current, record]);
    setDetailsFor(record.id);
  }, [edit]);

  const handleStatChange = useCallback(
    (id: string, key: NumericStatKey, value: number) =>
      edit((current) => withRecord(current, id, statPatch(key, value))),
    [edit],
  );

  const handleAcChange = useCallback(
    (id: string, ac: string) =>
      edit((current) => withRecord(current, id, { ac })),
    [edit],
  );

  const handleNameChange = useCallback(
    (id: string, name: string) =>
      edit((current) => withRecord(current, id, { name })),
    [edit],
  );

  const handleConditionsChange = useCallback(
    (id: string, conditions: Condition[]) =>
      edit((current) => withRecord(current, id, { conditions })),
    [edit],
  );

  const handleResourcesChange = useCallback(
    (id: string, resources: Resource[]) =>
      edit((current) => withRecord(current, id, { resources })),
    [edit],
  );

  const handleToggleHidden = useCallback(
    (id: string) =>
      edit((current) =>
        current.map((record) =>
          record.id === id ? { ...record, hidden: !record.hidden } : record,
        ),
      ),
    [edit],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setDetailsFor((open) => (open === id ? null : open));
      edit((current) => withoutRecord(current, id));
    },
    [edit],
  );

  /** Linking is exclusive: a token belongs to one record at a time. */
  const handleAssign = useCallback(
    (id: string, tokenId: string | null) =>
      edit((current) =>
        withRecord(
          tokenId === null ? current : releaseToken(current, tokenId),
          id,
          { tokenId },
        ),
      ),
    [edit],
  );

  /**
   * Advancing the round counts every condition in the scene down by one.
   *
   * Stepping back counts them up again, so the two arrows undo each other and
   * a mis-click costs nothing.
   */
  const stepRound = useCallback(
    (delta: 1 | -1) => {
      const next = Math.max(FIRST_ROUND, round + delta);
      if (next === round) return;

      setRoundState(next);
      edit((current) =>
        current.map((record) =>
          record.conditions.length === 0
            ? record
            : { ...record, conditions: stepDurations(record.conditions, -delta) },
        ),
      );
      void setRound(next).catch(() => setRoundState(round));
    },
    [edit, round],
  );

  const detailsRecord = useMemo(
    () => records.find((record) => record.id === detailsFor) ?? null,
    [detailsFor, records],
  );
  const detailsOpen = detailsRecord !== null;

  useEffect(() => {
    void OBR.action.setWidth(
      detailsOpen ? PANEL_WIDTH + DETAIL_WIDTH : PANEL_WIDTH,
    );
  }, [detailsOpen]);

  useEffect(() => {
    if (detailsFor !== null && detailsRecord === null) setDetailsFor(null);
  }, [detailsFor, detailsRecord]);

  const toggleDetails = useCallback((id: string) => {
    setDetailsFor((current) => (current === id ? null : id));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Enough travel that clicking into a field never starts a drag.
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over === null || active.id === over.id) return;

      const from = records.findIndex((record) => record.id === active.id);
      const to = records.findIndex((record) => record.id === over.id);
      if (from === -1 || to === -1) return;

      edit((current) => moveRecord(current, from, to));
    },
    [edit, records],
  );

  /** Linking needs exactly one token selected; two is ambiguous. */
  const selectedToken = useMemo(() => {
    if (selection.length !== 1) return undefined;
    return tokens.get(selection[0] ?? "");
  }, [selection, tokens]);

  return (
    <div className="app-surface flex h-full overflow-hidden">
      <div
        className="flex h-full shrink-0 flex-col"
        style={{ width: PANEL_WIDTH }}
      >
        <RoundBar
          round={round}
          onStep={stepRound}
          canStepBack={round > FIRST_ROUND}
          onAdd={addRecord}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 pt-1">
          {!sceneReady ? (
            <Placeholder>Open a scene to start tracking.</Placeholder>
          ) : visible.length === 0 ? (
            <Placeholder>
              Add a record with <strong>+</strong>, then link a token to it.
            </Placeholder>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToFirstScrollableAncestor]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={visible.map((record) => record.id)}
                strategy={verticalListSortingStrategy}
              >
                {visible.map((record) => (
                  <RecordRow
                    key={record.id}
                    record={record}
                    token={
                      record.tokenId === null
                        ? undefined
                        : tokens.get(record.tokenId)
                    }
                    selected={
                      record.tokenId !== null &&
                      selection.includes(record.tokenId)
                    }
                    detailsOpen={detailsFor === record.id}
                    onStatChange={handleStatChange}
                    onAcChange={handleAcChange}
                    onNameChange={handleNameChange}
                    onToggleDetails={toggleDetails}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </main>

        {/* Which build is actually running. The quickest way to tell a stale
            deploy from a real bug. */}
        <footer className="shrink-0 px-3 pb-1 text-right text-[10px] tabular-nums text-ink-300 dark:text-ink-700">
          v{__APP_VERSION__}
        </footer>
      </div>

      {detailsRecord !== null && (
        <RecordDrawer
          record={detailsRecord}
          token={
            detailsRecord.tokenId === null
              ? undefined
              : tokens.get(detailsRecord.tokenId)
          }
          selectedToken={selectedToken}
          isGm={isGm}
          onStatChange={handleStatChange}
          onConditionsChange={handleConditionsChange}
          onResourcesChange={handleResourcesChange}
          onAssign={handleAssign}
          onToggleHidden={handleToggleHidden}
          onDelete={handleDelete}
        />
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
