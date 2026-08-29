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
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  type CategoryDef,
  newCategory,
  withCategory,
  withoutCategory,
} from "@/core/categories";
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
  type TrackerState,
  parseState,
  updateState,
} from "@/core/recordStore";
import { FIRST_ROUND, parseSettings, setRound } from "@/core/settings";
import { indexTokens, isAssignableItem } from "@/core/tokens";
import type {
  AssignableToken,
  Condition,
  NumericStatKey,
  Resource,
  TrackedRecord,
} from "@/core/types";
import CategorySection, {
  categoryFromDroppableId,
} from "./CategorySection";
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

const EMPTY_STATE: TrackerState = { records: [], categories: [] };

export default function App() {
  const [state, setState] = useState<TrackerState>(EMPTY_STATE);
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
        setState(EMPTY_STATE);
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

  // Records, categories and the round all live in scene metadata.
  useEffect(() => {
    if (!sceneReady) return;
    const apply = (metadata: Metadata) => {
      setState(parseState(metadata));
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
    setDetailsFor(record.id);
  }, [editRecords]);

  const addCategory = useCallback(() => {
    editCategories((current) => [...current, newCategory()]);
  }, [editCategories]);

  /** Deleting a category unfiles its records rather than taking them with it. */
  const deleteCategory = useCallback(
    (id: string) =>
      edit((current) => ({
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

  const handleConditionsChange = useCallback(
    (id: string, conditions: Condition[]) =>
      editRecords((current) => withRecord(current, id, { conditions })),
    [editRecords],
  );

  const handleResourcesChange = useCallback(
    (id: string, resources: Resource[]) =>
      editRecords((current) => withRecord(current, id, { resources })),
    [editRecords],
  );

  const handleCategoryChange = useCallback(
    (id: string, categoryId: string | null) =>
      editRecords((current) => withRecord(current, id, { categoryId })),
    [editRecords],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setDetailsFor((open) => (open === id ? null : open));
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
      editRecords((current) =>
        current.map((record) =>
          record.conditions.length === 0
            ? record
            : {
                ...record,
                conditions: stepDurations(record.conditions, -delta),
              },
        ),
      );
      void setRound(next).catch(() => setRoundState(round));
    },
    [editRecords, round],
  );

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

    const ungrouped: TrackedRecord[] = [];
    const byCategory = new Map<string, TrackedRecord[]>();
    for (const category of visibleCategories) byCategory.set(category.id, []);

    for (const record of state.records) {
      const id = record.categoryId;
      if (id === null || !known.has(id)) {
        ungrouped.push(record);
        continue;
      }
      if (!allowed.has(id)) continue;
      byCategory.get(id)?.push(record);
    }

    return { ungrouped, byCategory };
  }, [state.categories, state.records, visibleCategories]);

  const visibleCount =
    groups.ungrouped.length +
    [...groups.byCategory.values()].reduce(
      (total, list) => total + list.length,
      0,
    );

  const detailsRecord = useMemo(
    () => state.records.find((record) => record.id === detailsFor) ?? null,
    [detailsFor, state.records],
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

  /** Linking needs exactly one token selected; two is ambiguous. */
  const selectedToken = useMemo(() => {
    if (selection.length !== 1) return undefined;
    return tokens.get(selection[0] ?? "");
  }, [selection, tokens]);

  const renderRows = (records: TrackedRecord[]) => (
    <SortableContext
      items={records.map((record) => record.id)}
      strategy={verticalListSortingStrategy}
    >
      {records.map((record) => (
        <RecordRow
          key={record.id}
          record={record}
          token={
            record.tokenId === null ? undefined : tokens.get(record.tokenId)
          }
          selected={
            record.tokenId !== null && selection.includes(record.tokenId)
          }
          detailsOpen={detailsFor === record.id}
          onStatChange={handleStatChange}
          onAcChange={handleAcChange}
          onNameChange={handleNameChange}
          onToggleDetails={toggleDetails}
        />
      ))}
    </SortableContext>
  );

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
          onAddRecord={addRecord}
          onAddCategory={addCategory}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 pt-1">
          {!sceneReady ? (
            <Placeholder>Open a scene to start tracking.</Placeholder>
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
              {groups.ungrouped.length > 0 && (
                <CategorySection
                  categoryId={null}
                  name="Ungrouped"
                  hidden={false}
                  count={groups.ungrouped.length}
                  editable={false}
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

      {detailsRecord !== null && (
        <RecordDrawer
          record={detailsRecord}
          categories={visibleCategories}
          token={
            detailsRecord.tokenId === null
              ? undefined
              : tokens.get(detailsRecord.tokenId)
          }
          selectedToken={selectedToken}
          onStatChange={handleStatChange}
          onConditionsChange={handleConditionsChange}
          onResourcesChange={handleResourcesChange}
          onCategoryChange={handleCategoryChange}
          onAssign={handleAssign}
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
