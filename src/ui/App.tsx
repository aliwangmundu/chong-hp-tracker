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
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
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
import CommandBar from "./CommandBar";
import CategorySection, {
  categoryFromDroppableId,
} from "./CategorySection";
import RecordDetails from "./RecordDetails";
import RecordRow from "./RecordRow";
import RoundBar from "./RoundBar";
import ViewTabs, { type View } from "./ViewTabs";

/**
 * Popover width. Fixed now that details open inline rather than beside the
 * list, so this only has to agree with `action.width` in manifest.json.
 */
const PANEL_WIDTH = 288;

/** Collapse keys for the two sections that are not real categories. */
const CHOSEN_ID = "chosen";
const UNGROUPED_ID = "ungrouped";

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
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [view, setView] = useState<View>("PLAYER");
  const viewChosen = useRef(false);
  const chooseView = useCallback((next: View) => {
    viewChosen.current = true;
    setView(next);
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
      if (!viewChosen.current) setView(role === "GM" ? "DM" : "PLAYER");
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
   * The panel shows the change at once, then the scene write goes out built
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

  const addRecord = useCallback(() => {
    const record = newRecord();
    editRecords((current) => [...current, record]);
    // Open it straight away: a new record has no name yet, and naming it is the
    // first thing anyone wants to do.
    setExpandedId(record.id);
  }, [editRecords]);

  /**
   * Bulk entry from the command bar.
   *
   * Categories named in the input are matched case-insensitively and created if
   * missing — hidden, like any new category, so a wave typed in mid-session
   * does not appear on the players' panel the moment it exists. Records and
   * categories go in one write so a new group can never arrive without the
   * records that asked for it.
   */
  const addFromCommand = useCallback(
    (specs: RecordSpec[]) => {
      if (specs.length === 0) return;
      edit((current) => {
        const categories = [...current.categories];
        const byName = new Map(
          categories.map((category) => [category.name.toLowerCase(), category]),
        );

        const records = [...current.records];
        for (const spec of specs) {
          let categoryId: string | null = null;
          if (spec.group !== null) {
            const key = spec.group.toLowerCase();
            let category = byName.get(key);
            if (category === undefined) {
              category = newCategory(spec.group);
              categories.push(category);
              byName.set(key, category);
            }
            categoryId = category.id;
          }
          records.push({
            ...newRecord(spec.name),
            hp: spec.hp,
            maxHp: spec.maxHp,
            ac: spec.ac,
            categoryId,
          });
        }

        return { ...current, records, categories };
      });
    },
    [edit],
  );

  const addCategory = useCallback(() => {
    editCategories((current) => [...current, newCategory()]);
  }, [editCategories]);

  /** Deleting a category unfiles its records rather than taking them with it. */
  const deleteCategory = useCallback(
    (id: string) =>
      edit((current) => ({
        ...current,
        categories: withoutCategory(current.categories, id),
        records: current.records.map((record) =>
          record.categoryId === id ? { ...record, categoryId: null } : record,
        ),
      })),
    [edit],
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
      previous.size === derived.size && [...derived].every((id) => previous.has(id));
    if (unchanged) return;

    fromTokens.current = derived;
    setChosen(derived);
  }, [selection, state.records]);

  const toggleCollapsed = useCallback((key: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  /**
   * What this person is allowed to see.
   *
   * The GM sees every category. Everyone else sees the ungrouped list plus any
   * category not marked hidden — and a record filed under a category that has
   * since been deleted falls back to ungrouped rather than vanishing.
   */
  const visibleCategories = useMemo(
    () =>
      isGm
        ? state.categories
        : state.categories.filter((category) => !category.hidden),
    [isGm, state.categories],
  );

  const groups = useMemo(() => {
    const known = new Set(state.categories.map((category) => category.id));
    const allowed = new Set(visibleCategories.map((category) => category.id));

    const picked: TrackedRecord[] = [];
    const ungrouped: TrackedRecord[] = [];
    const byCategory = new Map<string, TrackedRecord[]>();
    for (const category of visibleCategories) byCategory.set(category.id, []);

    for (const record of state.records) {
      const id = record.categoryId;
      const filed = id !== null && known.has(id);
      // A hidden category hides its records even from Chosen — otherwise a
      // player could pull one out of a category they cannot see.
      if (filed && !allowed.has(id)) continue;

      if (chosen.has(record.id)) {
        picked.push(record);
        continue;
      }
      if (!filed) {
        ungrouped.push(record);
        continue;
      }
      byCategory.get(id)?.push(record);
    }

    return { picked, ungrouped, byCategory };
  }, [chosen, state.categories, state.records, visibleCategories]);

  const visibleCount =
    groups.picked.length +
    groups.ungrouped.length +
    [...groups.byCategory.values()].reduce(
      (total, list) => total + list.length,
      0,
    );

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
      // Enough travel that clicking into a field never starts a drag.
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

      const asSection = categoryFromDroppableId(overId);
      if (asSection === CHOSEN_ID) return;
      if (asSection !== undefined) {
        editRecords((current) =>
          moveRecordInto(current, activeId, asSection, null),
        );
        return;
      }

      const target = state.records.find((record) => record.id === overId);
      if (target === undefined) return;
      editRecords((current) =>
        moveRecordInto(current, activeId, target.categoryId, overId),
      );
    },
    [editRecords, state.records],
  );

  /**
   * Everything this person may see, flat and in list order.
   *
   * The player view has no categories at all — the grouping is the GM's filing
   * system, not something a player should have to navigate mid-fight — so the
   * hidden ones are simply filtered out and the rest run together.
   */
  const flatRecords = useMemo(() => {
    const known = new Set(state.categories.map((category) => category.id));
    const allowed = new Set(visibleCategories.map((category) => category.id));
    return state.records.filter((record) => {
      const id = record.categoryId;
      if (id === null || !known.has(id)) return true;
      return allowed.has(id);
    });
  }, [state.categories, state.records, visibleCategories]);

  /** Linking needs exactly one token selected; two is ambiguous. */
  const selectedToken = useMemo(() => {
    if (selection.length !== 1) return undefined;
    return tokens.get(selection[0] ?? "");
  }, [selection, tokens]);

  const renderRows = (records: TrackedRecord[], adjustable = false) => (
    <SortableContext
      items={records.map((record) => record.id)}
      strategy={verticalListSortingStrategy}
    >
      {records.map((record) => {
        const token =
          record.tokenId === null ? undefined : tokens.get(record.tokenId);
        return (
          <Fragment key={record.id}>
            <RecordRow
              record={record}
              token={token}
              selectedToken={selectedToken}
              selected={
                record.tokenId !== null && selection.includes(record.tokenId)
              }
              expanded={expandedId === record.id}
              showAdjust={adjustable}
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
                onDelete={handleDelete}
              />
            )}
          </Fragment>
        );
      })}
    </SortableContext>
  );

  return (
    <div className="app-surface flex h-full overflow-hidden">
      <div
        className="flex h-full shrink-0 flex-col"
        style={{ width: PANEL_WIDTH }}
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

        <ViewTabs view={view} onChange={chooseView} />

        {commandOpen && (
          <CommandBar
            onSubmit={addFromCommand}
            onClose={() => setCommandOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 pt-1">
          {view === "PLAYER" ? (
            flatRecords.length === 0 ? (
              <Placeholder>Nothing to track yet.</Placeholder>
            ) : (
              // No DndContext: with the sections gone there is nothing to drag
              // between, and reordering a filtered list would shuffle records
              // the player cannot see.
              renderRows(flatRecords, true)
            )
          ) : visibleCount === 0 && visibleCategories.length === 0 ? (
            <Placeholder>
              Add a record with <strong>+</strong>, then link a token to it.
            </Placeholder>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              modifiers={[restrictToFirstScrollableAncestor]}
              onDragEnd={handleDragEnd}
            >
              {/* Always present — it is the working set, and an empty one
                  still has to say what puts something in it. */}
              <CategorySection
                categoryId={CHOSEN_ID}
                name="Chosen"
                hidden={false}
                count={groups.picked.length}
                editable={false}
                accent
                collapsed={collapsed.has(CHOSEN_ID)}
                onToggleCollapsed={() => toggleCollapsed(CHOSEN_ID)}
                emptyHint="Select a token on the map."
                onRename={() => {}}
                onToggleHidden={() => {}}
                onDelete={() => {}}
              >
                {renderRows(groups.picked)}
              </CategorySection>

              {groups.ungrouped.length > 0 && (
                <CategorySection
                  categoryId={null}
                  name="Ungrouped"
                  hidden={false}
                  count={groups.ungrouped.length}
                  editable={false}
                  collapsed={collapsed.has(UNGROUPED_ID)}
                  onToggleCollapsed={() => toggleCollapsed(UNGROUPED_ID)}
                  onRename={() => {}}
                  onToggleHidden={() => {}}
                  onDelete={() => {}}
                >
                  {renderRows(groups.ungrouped)}
                </CategorySection>
              )}

              {visibleCategories.map((category) => {
                const records = groups.byCategory.get(category.id) ?? [];
                return (
                  <CategorySection
                    key={category.id}
                    categoryId={category.id}
                    name={category.name}
                    hidden={category.hidden}
                    count={records.length}
                    editable
                    collapsed={collapsed.has(category.id)}
                    onToggleCollapsed={() => toggleCollapsed(category.id)}
                    onRename={(name) =>
                      editCategories((current) =>
                        withCategory(current, category.id, { name }),
                      )
                    }
                    onToggleHidden={() =>
                      editCategories((current) =>
                        withCategory(current, category.id, {
                          hidden: !category.hidden,
                        }),
                      )
                    }
                    onDelete={() => deleteCategory(category.id)}
                  >
                    {renderRows(records)}
                  </CategorySection>
                );
              })}
            </DndContext>
          )}
        </main>

        {/* Which build is actually running. The quickest way to tell a stale
            deploy from a real bug. */}
        <footer className="shrink-0 px-3 pb-1 text-right text-[10px] tabular-nums text-ink-300 dark:text-ink-700">
          v{__APP_VERSION__}
        </footer>
      </div>
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
