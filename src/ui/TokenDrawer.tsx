import type { ReactNode } from "react";
import { clampExtraHp, clampMaxHp } from "@/core/inlineMath";
import type {
  Condition,
  NumericStatKey,
  Resource,
  RollEntry,
  TrackedToken,
} from "@/core/types";
import ConditionList from "./ConditionList";
import ResourceList from "./ResourceList";
import RollList from "./RollList";
import StatField from "./StatField";

/** Extra popover width the second card needs, in pixels. */
export const DETAIL_WIDTH = 300;

type Props = {
  token: TrackedToken;
  onStatChange: (id: string, key: NumericStatKey, value: number) => void;
  onConditionsChange: (id: string, next: Condition[]) => void;
  onResourcesChange: (id: string, next: Resource[]) => void;
  onRollsChange: (id: string, next: RollEntry[]) => void;
  onRoll: (id: string, entry: RollEntry) => void;
  rollError: string | null;
};

/**
 * A second card that opens beside the list rather than on top of it.
 *
 * App widens the Owlbear popover by exactly this card's width, so the card
 * lands in space that did not exist a moment ago and the list never reflows.
 * No transition: `OBR.action.setWidth` snaps, and animating the card against a
 * window that cannot animate with it is what read as jitter.
 *
 * The `+` on the row is the only control — it opens and closes this card — so
 * there is no close button here.
 */
export default function TokenDrawer({
  token,
  onStatChange,
  onConditionsChange,
  onResourcesChange,
  onRollsChange,
  onRoll,
  rollError,
}: Props) {
  return (
    <div
      className="flex h-full shrink-0 flex-col border-l border-ink-200 dark:border-ink-800"
      style={{ width: DETAIL_WIDTH }}
    >
      <header className="flex items-center gap-2 border-b border-ink-200 px-2 py-2 dark:border-ink-800">
        <img
          src={token.imageUrl}
          alt=""
          draggable={false}
          className="drag-none size-6 shrink-0 rounded object-contain"
        />
        <h2
          className="min-w-0 flex-1 truncate text-sm font-medium"
          title={token.name}
        >
          {token.name || "Unnamed"}
        </h2>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {/* Extra and max share one line — two secondary numbers do not deserve
            a stacked row each when the card has lists to fit below them. */}
        <div className="flex items-center gap-2">
          <InlineStat label="Extra">
            <StatField
              label={`${token.name} extra hit points`}
              value={token.stats.extraHp}
              widthClass="w-12"
              allowMath={false}
              onCommit={(next) =>
                onStatChange(token.id, "extraHp", clampExtraHp(next))
              }
            />
          </InlineStat>
          <InlineStat label="Max">
            <StatField
              label={`${token.name} maximum hit points`}
              value={token.stats.maxHp}
              widthClass="w-12"
              allowMath={false}
              onCommit={(next) =>
                onStatChange(token.id, "maxHp", clampMaxHp(next))
              }
            />
          </InlineStat>
        </div>

        <ConditionList
          conditions={token.stats.conditions}
          onChange={(next) => onConditionsChange(token.id, next)}
        />

        <ResourceList
          resources={token.stats.resources}
          onChange={(next) => onResourcesChange(token.id, next)}
        />

        <RollList
          rolls={token.stats.rolls}
          error={rollError}
          onChange={(next) => onRollsChange(token.id, next)}
          onRoll={(entry) => onRoll(token.id, entry)}
        />
      </div>
    </div>
  );
}

function InlineStat({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center gap-1.5">
      <span className="text-xs text-ink-500 dark:text-ink-400">{label}</span>
      {children}
    </div>
  );
}
