import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  type Category,
  CATEGORY_LABEL,
  type NumericStatKey,
  type TrackedToken,
} from "@/core/types";
import TokenRow from "./TokenRow";

export const droppableIdFor = (category: Category) => `category:${category}`;

export function categoryFromDroppableId(id: string): Category | undefined {
  if (id === droppableIdFor("PLAYER")) return "PLAYER";
  if (id === droppableIdFor("ADVERSARY")) return "ADVERSARY";
  return undefined;
}

type Props = {
  category: Category;
  tokens: TrackedToken[];
  selection: string[];
  onStatChange: (id: string, key: NumericStatKey, value: number) => void;
  onAcChange: (id: string, value: string) => void;
  onToggleDetails: (id: string) => void;
  openDetailsId: string | null;
  /** Optional control pinned to the right of the section heading. */
  headerAction?: ReactNode;
};

export default function CategorySection({
  category,
  tokens,
  selection,
  onStatChange,
  onAcChange,
  onToggleDetails,
  openDetailsId,
  headerAction,
}: Props) {
  // The section itself is a drop target so an empty category still accepts a
  // row, and so dropping below the last row appends rather than doing nothing.
  const { setNodeRef, isOver } = useDroppable({ id: droppableIdFor(category) });

  return (
    <section className="pb-1">
      <header className="flex items-center gap-2 px-2 pb-1 pt-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          {CATEGORY_LABEL[category]}
        </h2>
        <span className="text-[11px] tabular-nums text-ink-400 dark:text-ink-600">
          {tokens.length}
        </span>
        <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
        {headerAction}
      </header>

      <div
        ref={setNodeRef}
        className={[
          "min-h-[2.5rem] rounded-lg transition-colors",
          isOver ? "bg-ink-200/50 dark:bg-ink-900/70" : "",
        ].join(" ")}
      >
        <SortableContext
          items={tokens.map((token) => token.id)}
          strategy={verticalListSortingStrategy}
        >
          {tokens.length === 0 ? (
            <p className="px-2 py-2 text-xs text-ink-400 dark:text-ink-600">
              Drag a token here.
            </p>
          ) : (
            tokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                selected={selection.includes(token.id)}
                onStatChange={onStatChange}
                onAcChange={onAcChange}
                onToggleDetails={onToggleDetails}
                detailsOpen={openDetailsId === token.id}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}
