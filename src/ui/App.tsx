import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import OBR, { type Item, type Metadata } from "@owlbear-rodeo/sdk";
import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  type CategoryDef,
  newCategory,
  withCategory,
  withoutCategory,
} from "@/core/categories";
import type { RecordSpec } from "@/core/command";
import { stepDurations } from "@/core/entries";
import {
  moveRecordInto,
  newRecord,
  releaseToken,
  statPatch,
  withRecord,
  withoutRecord,
} from "@/core/records";
import {
  EMPTY_STATE,
  type TrackerState,
  migrateSceneToRoom,
  parseState,
  readState,
  updateState,
} from "@/core/recordStore";
import { FIRST_ROUND } from "@/core/settings";
import { indexTokens, isAssignableItem } from "@/core/tokens";
import type {
  AssignableToken,
  Condition,
  NumericStatKey,
  TrackedRecord,
} from "@/core/types";
import CategoryBar from "./CategoryBar";
import CommandBar from "./CommandBar";
import RecordDetails from "./RecordDetails";
import RecordRow from "./RecordRow";
import RoundBar from "./RoundBar";
import TabStrip, {
  CHOSEN_TAB,
  PLAYER_TAB,
  UNGROUPED_TAB,
  type TabDef,
  tabFromDroppableId,
} from "./TabStrip";

/**
 * Popover width. Fixed now that details open inline rather than beside the
 * list, so this only has to agree with `action.width` in manifest.json.
 */
const PANEL_WIDTH = 288;

export default function App() {
  const [state, setState] = useState<TrackerState>(EMPTY_STATE);
  const [tokens, setTokens] = useState(new Map<string, AssignableToken>());
  const [selection, setSelection] = useState<string[]>([]);
  const [sceneReady, setSceneReady] = useState(false);
  const [isGm, setIsGm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  /** Per-person working set. Never written to the room. */
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>(PLAYER_TAB);
  /** The record under the pointer mid-drag, for the floating preview. */
  const [dragging, setDragging] = useState<string | null>(null);
  const tabPicked = useRef(false);
  const pickTab = useCallback((next: string) => {
    tabPicked.current = true;
    setActiveTab(next);
  }, []);

  // Scene tokens — only for linking, thumbnails and names.
  useEffect(() => {
    const update = (items: Item[]) => setTokens(indexTokens(items));

    const handleReady = (ready: boolean) => {
      setSceneReady(ready);
      if (ready) {
        void OBR.scene.items.getItems(isAssignableItem).then(update);
      } else {
        // Only the tokens are scene-bound; the records outlive the scene.
        setTokens(new Map());
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

  /**
   * Records, categories and the round all live in *room* metadata.
   *
   * That is what carries them from scene to scene, and it is why this is not
   * gated on a scene being open — the list is there before you pick a map.
   */
  useEffect(() => {
    const apply = (metadata: Metadata) => setState(parseState(metadata));
    void OBR.room.getMetadata().then(apply);
    return OBR.room.onMetadataChange(apply);
  }, []);

  // Lift a pre-2.3 scene's list into the room, once, if the room is empty.
  useEffect(() => {
    if (!sceneReady || !isGm) return;
    void migrateSceneToRoom(isGm).then(async (moved) => {
      if (moved) setState(await readState());
    });
  }, [isGm, sceneReady]);

  useEffect(() => {
    void OBR.player.getSelection().then((ids) => setSelection(ids ?? []));
    void OBR.player.getRole().then((role) => {
      setIsGm(role === "GM");
      // The role picks the opening tab and then stops mattering — switching is
      // free, so this must not fight the person after they have chosen.
      if (!tabPicked.current) {
        setActiveTab(role === "GM" ? UNGROUPED_TAB : PLAYER_TAB);
      }
    });
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

  /**
   * Optimistic write.
   *
   * The panel shows the change at once, then the room write goes out built
   * from the live metadata rather than this local copy — so two people editing
   * different records do not overwrite each other.
   */
  const edit = useCallback(
    (mutate: (state: TrackerState) => TrackerState) => {
      setState(mutate);
      void updateState(mutate);
    },
    [],
  );

  const editRecords = useCallback(
    (mutate: (records: TrackedRecord[]) => TrackedRecord[]) =>
      edit((current) => ({ ...current, records: mutate(current.records) })),
    [edit],
  );

  const editCategories = useCallback(
    (mutate: (categories: CategoryDef[]) => CategoryDef[]) =>
      edit((current) => ({
        ...current,
        categories: mutate(current.categories),
      })),
    [edit],
  );

  /**
   * What the open tab means for a record made while it is open.
   *
   * New records land where you are looking. Typing eight goblins into the
   * command bar on the Undead tab and finding them somewhere else would be a
   * small betrayal every time.
   */
  const tabDefaults = useCallback(
    (categories: CategoryDef[]) => {
      if (activeTab === PLAYER_TAB) return { categoryId: null, isPlayer: true };
      const filed = categories.some((category) => category.id === activeTab);
      return { categoryId: filed ? activeTab : null, isPlayer: false };
    },
    [activeTab],
  );

  const addRecord = useCallback(() => {
    // The id is needed to open the panel, so the record is built here rather
    // than inside the mutate closure.
    const record = newRecord();
    edit((current) => ({
      ...current,
      records: [
        ...current.records,
        { ...record, ...tabDefaults(current.categories) },
      ],
    }));
    // Open it straight away: a new record has no name yet, and naming it is the
    // first thing anyone wants to do.
    setExpandedId(record.id);
  }, [edit, tabDefaults]);

  /**
   * Bulk entry from the command bar.
   *
   * Categories named in the input are matched case-insensitively and created if
   * missing — hidden, like any new category, so a wave typed in mid-session
   * does not appear on the players' panel the moment it exists. Anything
   * without a `#group` follows the open tab. Records and categories go in one
   * write so a new group can never arrive without the records that asked for
   * it.
   */
  const addFromCommand = useCallback(
    (specs: RecordSpec[]) => {
      if (specs.length === 0) return;
      edit((current) => {
        const categories = [...current.categories];
        const byName = new Map(
          categories.map((category) => [category.name.toLowerCase(), category]),
        );
        const fallback = tabDefaults(current.categories);

        const records = [...current.records];
        for (const spec of specs) {
          let categoryId = fallback.categoryId;
          let isPlayer = fallback.isPlayer;
          if (spec.group !== null) {
            const key = spec.group.toLowerCase();
            let category = byName.get(key);
            if (category === undefined) {
              category = newCategory(spec.group);
              categories.push(category);
              byName.set(key, category);
            }
            // A named group is an instruction; it overrides the open tab.
            categoryId = category.id;
            isPlayer = false;
          }
          records.push({
            ...newRecord(spec.name),
            hp: spec.hp,
            maxHp: spec.maxHp,
            ac: spec.ac,
            categoryId,
            isPlayer,
          });
        }

        return { ...current, records, categories };
      });
    },
    [edit, tabDefaults],
  );

  /** A new category is somewhere you want to be, so it opens. */
  const addCategory = useCallback(() => {
    const category = newCategory();
    editCategories((current) => [...current, category]);
    pickTab(category.id);
  }, [editCategories, pickTab]);

  /** Deleting a category unfiles its records rather than taking them with it. */
  const deleteCategory = useCallback(
    (id: string) => {
      edit((current) => ({
        ...current,
        categories: withoutCategory(current.categories, id),
        records: current.records.map((record) =>
          record.categoryId === id ? { ...record, categoryId: null } : record,
        ),
      }));
      // Follow the records out rather than leaving the person on a dead tab.
      pickTab(UNGROUPED_TAB);
    },
    [edit, pickTab],
  );

  const handleStatChange = useCallback(
    (id: string, key: NumericStatKey, value: number) =>
      editRecords((current) => withRecord(current, id, statPatch(key, value))),
    [editRecords],
  );

  const handleAcChange = useCallback(
    (id: string, ac: string) =>
      editRecords((current) => withRecord(current, id, { ac })),
    [editRecords],
  );

  const handleNameChange = useCallback(
    (id: string, name: string) =>
      editRecords((current) => withRecord(current, id, { name })),
    [editRecords],
  );

  const handleNoteChange = useCallback(
    (id: string, note: string) =>
      editRecords((current) => withRecord(current, id, { note })),
    [editRecords],
  );

  const handleConditionsChange = useCallback(
    (id: string, conditions: Condition[]) =>
      editRecords((current) => withRecord(current, id, { conditions })),
    [editRecords],
  );

  /**
   * Hands a record to the players, or takes it back.
   *
   * The tick and the tabs say the same thing: a record sits in exactly one tab.
   * Its `categoryId` is left alone underneath, so unticking sends it home to
   * the category it came from rather than dumping it in Ungrouped.
   */
  const handleTogglePlayer = useCallback(
    (id: string) =>
      editRecords((current) =>
        current.map((record) =>
          record.id === id ? { ...record, isPlayer: !record.isPlayer } : record,
        ),
      ),
    [editRecords],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setExpandedId((open) => (open === id ? null : open));
      editRecords((current) => withoutRecord(current, id));
    },
    [editRecords],
  );

  /** Linking is exclusive: a token belongs to one record at a time. */
  const handleAssign = useCallback(
    (id: string, tokenId: string | null) =>
      editRecords((current) =>
        withRecord(
          tokenId === null ? current : releaseToken(current, tokenId),
          id,
          { tokenId },
        ),
      ),
    [editRecords],
  );

  /**
   * Advancing the round counts every condition down by one.
   *
   * Stepping back counts them up again, so the two arrows undo each other and a
   * mis-click costs nothing. The round and the conditions move in a single
   * write: as two writes, each echoed back a snapshot the other had not landed
   * in yet and the second echo reverted the first.
   */
  const stepRound = useCallback(
    (delta: 1 | -1) => {
      edit((current) => {
        const next = Math.max(FIRST_ROUND, current.round + delta);
        if (next === current.round) return current;
        return {
          ...current,
          round: next,
          records: current.records.map((record) =>
            record.conditions.length === 0
              ? record
              : {
                  ...record,
                  conditions: stepDurations(record.conditions, -delta),
                },
          ),
        };
      });
    },
    [edit],
  );

  /**
   * Selecting a token on the map puts its record in Chosen; deselecting takes
   * it out again. That is the only way in or out — Chosen is a mirror of the
   * map selection, not a second thing to keep in step by hand.
   */
  const fromTokens = useRef<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const derived = new Set<string>();
    for (const record of state.records) {
      if (record.tokenId !== null && selection.includes(record.tokenId)) {
        derived.add(record.id);
      }
    }

    const previous = fromTokens.current;
    const unchanged =
      previous.size === derived.size &&
      [...derived].every((id) => previous.has(id));
    if (unchanged) return;

    fromTokens.current = derived;
    setChosen(derived);
  }, [selection, state.records]);

  /**
   * What this person is allowed to see.
   *
   * The GM sees every category. Everyone else sees any category not marked
   * hidden — and a record filed under a category that has since been deleted
   * falls back to Ungrouped rather than vanishing.
   */
  const visibleCategories = useMemo(
    () =>
      isGm
        ? state.categories
        : state.categories.filter((category) => !category.hidden),
    [isGm, state.categories],
  );

  const tabs = useMemo<TabDef[]>(
    () => [
      { id: PLAYER_TAB, label: "Player", kind: "player", hidden: false },
      { id: CHOSEN_TAB, label: "Chosen", kind: "chosen", hidden: false },
      {
        id: UNGROUPED_TAB,
        label: "Ungrouped",
        kind: "ungrouped",
        hidden: false,
      },
      ...visibleCategories.map<TabDef>((category) => ({
        id: category.id,
        label: category.name,
        kind: "category",
        hidden: category.hidden,
      })),
    ],
    [visibleCategories],
  );

  // A category that is deleted, or hidden out from under a player, must not
  // leave them staring at a tab that no longer exists.
  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) setActiveTab(UNGROUPED_TAB);
  }, [activeTab, tabs]);

  const activeCategory = useMemo(
    () => state.categories.find((category) => category.id === activeTab),
    [activeTab, state.categories],
  );

  /**
   * The one list on screen.
   *
   * Chosen is the exception to "a record sits in exactly one tab": it is a
   * window onto the map selection, so a record shows there *as well as* in the
   * tab it lives in. A hidden category still hides its records from Chosen —
   * otherwise a player could pull one out of a category they cannot see.
   */
  const shown = useMemo(() => {
    const known = new Set(state.categories.map((category) => category.id));
    const allowed = new Set(visibleCategories.map((category) => category.id));
    const permitted = (record: TrackedRecord) => {
      const id = record.categoryId;
      if (id === null || !known.has(id)) return true;
      return allowed.has(id);
    };

    switch (activeTab) {
      case PLAYER_TAB:
        return state.records.filter(
          (record) => record.isPlayer && permitted(record),
        );
      case CHOSEN_TAB:
        return state.records.filter(
          (record) => chosen.has(record.id) && permitted(record),
        );
      case UNGROUPED_TAB:
        return state.records.filter(
          (record) =>
            !record.isPlayer &&
            (record.categoryId === null || !known.has(record.categoryId)),
        );
      default:
        return allowed.has(activeTab)
          ? state.records.filter(
              (record) => !record.isPlayer && record.categoryId === activeTab,
            )
          : [];
    }
  }, [activeTab, chosen, state.categories, state.records, visibleCategories]);

  // A record deleted from under an open panel must not leave it open.
  useEffect(() => {
    if (expandedId === null) return;
    if (!state.records.some((record) => record.id === expandedId)) {
      setExpandedId(null);
    }
  }, [expandedId, state.records]);

  // Fixed width; only needs setting in case an older build left it wider.
  useEffect(() => {
    void OBR.action.setWidth(PANEL_WIDTH);
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  /**
   * Rows beat tabs.
   *
   * The strip sits directly above the list, so a drag that ends over a row is
   * always read as a reorder; only a drop genuinely on the strip files the
   * record somewhere else.
   */
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const under = pointerWithin(args);
    const rows = under.filter(
      (collision) => !String(collision.id).startsWith("tab:"),
    );
    if (rows.length > 0) return rows;
    if (under.length > 0) return under;
    return closestCenter(args);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Enough travel that clicking into a field never starts a drag.
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDragging(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDragging(null);
      const { active, over } = event;
      if (over === null) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      // Dropped on a tab: the record moves there.
      const asTab = tabFromDroppableId(overId);
      if (asTab !== undefined) {
        // Chosen mirrors the map selection; there is nothing to file into it.
        if (asTab === CHOSEN_TAB) return;
        if (asTab === PLAYER_TAB) {
          editRecords((current) =>
            withRecord(current, activeId, { isPlayer: true }),
          );
          return;
        }
        const categoryId = asTab === UNGROUPED_TAB ? null : asTab;
        editRecords((current) =>
          withRecord(
            moveRecordInto(current, activeId, categoryId, null),
            activeId,
            { isPlayer: false },
          ),
        );
        return;
      }

      // Dropped on a row: reorder.
      const target = state.records.find((record) => record.id === overId);
      if (target === undefined) return;
      // Player and Chosen mix records from several categories, so taking the
      // target's category here would silently refile the one being dragged.
      const mixed = activeTab === PLAYER_TAB || activeTab === CHOSEN_TAB;
      const moving = state.records.find((record) => record.id === activeId);
      const categoryId = mixed
        ? (moving?.categoryId ?? null)
        : target.categoryId;
      editRecords((current) =>
        moveRecordInto(current, activeId, categoryId, overId),
      );
    },
    [activeTab, editRecords, state.records],
  );

  /** Linking needs exactly one token selected; two is ambiguous. */
  const selectedToken = useMemo(() => {
    if (selection.length !== 1) return undefined;
    return tokens.get(selection[0] ?? "");
  }, [selection, tokens]);

  const draggedRecord = useMemo(
    () =>
      dragging === null
        ? undefined
        : state.records.find((record) => record.id === dragging),
    [dragging, state.records],
  );

  const emptyMessage: ReactNode = useMemo(() => {
    switch (activeTab) {
      case PLAYER_TAB:
        return (
          <>
            Nothing here yet. Tick <strong>Player</strong> at the bottom of a
            record, or drag one onto this tab.
          </>
        );
      case CHOSEN_TAB:
        return "Select a token on the map.";
      case UNGROUPED_TAB:
        return (
          <>
            Add a record with <strong>+</strong>, then link a token to it.
          </>
        );
      default:
        return "Empty. Drag a record onto this tab to file it here.";
    }
  }, [activeTab]);

  return (
    <div className="app-surface flex h-full overflow-hidden">
      <div
        className="flex h-full shrink-0 flex-col"
        style={{ width: PANEL_WIDTH }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragging(null)}
        >
          <RoundBar
            round={state.round}
            onStep={stepRound}
            canStepBack={state.round > FIRST_ROUND}
            onAddRecord={addRecord}
            onAddCategory={addCategory}
            onToggleCommand={() => setCommandOpen((open) => !open)}
            commandOpen={commandOpen}
          />

          <TabStrip tabs={tabs} active={activeTab} onSelect={pickTab} />

          {activeCategory !== undefined && (
            <CategoryBar
              name={activeCategory.name}
              hidden={activeCategory.hidden}
              onRename={(name) =>
                editCategories((current) =>
                  withCategory(current, activeCategory.id, { name }),
                )
              }
              onToggleHidden={() =>
                editCategories((current) =>
                  withCategory(current, activeCategory.id, {
                    hidden: !activeCategory.hidden,
                  }),
                )
              }
              onDelete={() => deleteCategory(activeCategory.id)}
            />
          )}

          {commandOpen && (
            <CommandBar
              onSubmit={addFromCommand}
              onClose={() => setCommandOpen(false)}
            />
          )}

          <main className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 pt-1">
            {shown.length === 0 ? (
              <Placeholder>{emptyMessage}</Placeholder>
            ) : (
              <SortableContext
                items={shown.map((record) => record.id)}
                strategy={verticalListSortingStrategy}
              >
                {shown.map((record) => {
                  const token =
                    record.tokenId === null
                      ? undefined
                      : tokens.get(record.tokenId);
                  return (
                    <Fragment key={record.id}>
                      <RecordRow
                        record={record}
                        token={token}
                        selectedToken={selectedToken}
                        selected={
                          record.tokenId !== null &&
                          selection.includes(record.tokenId)
                        }
                        expanded={expandedId === record.id}
                        showAdjust={activeTab === PLAYER_TAB}
                        onStatChange={handleStatChange}
                        onToggleExpanded={toggleExpanded}
                        onAssign={handleAssign}
                      />
                      {expandedId === record.id && (
                        <RecordDetails
                          record={record}
                          token={token}
                          onStatChange={handleStatChange}
                          onAcChange={handleAcChange}
                          onNameChange={handleNameChange}
                          onNoteChange={handleNoteChange}
                          onConditionsChange={handleConditionsChange}
                          onAssign={handleAssign}
                          onTogglePlayer={handleTogglePlayer}
                          onDelete={handleDelete}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </SortableContext>
            )}
          </main>

          {/* A floating copy, portalled out of the scrolling list. Without it
              the row is clipped the moment it is dragged up over the tabs —
              which is now the whole point of dragging one. */}
          <DragOverlay dropAnimation={null}>
            {draggedRecord === undefined ? null : (
              <DragPreview
                record={draggedRecord}
                token={
                  draggedRecord.tokenId === null
                    ? undefined
                    : tokens.get(draggedRecord.tokenId)
                }
              />
            )}
          </DragOverlay>
        </DndContext>

        {/* Which build is actually running. The quickest way to tell a stale
            deploy from a real bug. */}
        <footer className="shrink-0 px-3 pb-1 text-right text-[10px] tabular-nums text-ink-300 dark:text-ink-700">
          v{__APP_VERSION__}
        </footer>
      </div>
    </div>
  );
}

/** What you are holding, while you are holding it. */
function DragPreview({
  record,
  token,
}: {
  record: TrackedRecord;
  token: AssignableToken | undefined;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white px-1 py-1 shadow-lg ring-1 ring-ink-300 dark:bg-ink-900 dark:ring-ink-700">
      {token !== undefined ? (
        <img
          src={token.imageUrl}
          alt=""
          draggable={false}
          className="drag-none size-7 shrink-0 rounded object-contain"
        />
      ) : (
        <span className="size-7 shrink-0 rounded border border-dashed border-ink-300 dark:border-ink-700" />
      )}
      <span className="min-w-0 flex-1 truncate px-1 text-sm">
        {record.name || token?.name || "Unnamed"}
      </span>
      <span className="shrink-0 px-1 text-sm tabular-nums">{record.hp}</span>
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
