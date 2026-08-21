import type { ReactNode } from "react";
import { clampExtraHp, clampMaxHp } from "@/core/inlineMath";
import type {
  Condition,
  NumericStatKey,
  Resource,
  TrackedToken,
} from "@/core/types";
import ConditionList from "./ConditionList";
import ResourceList from "./ResourceList";
import StatField from "./StatField";

/** Extra popover width the second card needs, in pixels. */
export const DETAIL_WIDTH = 260;

type Props = {
  token: TrackedToken;
  onStatChange: (id: string, key: NumericStatKey, value: number) => void;
  onConditionsChange: (id: string, next: Condition[]) => void;
  onResourcesChange: (id: string, next: Resource[]) => void;
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
        <dl className="space-y-2">
          <Row term="Extra HP">
            <StatField
              label={`${token.name} extra hit points`}
              value={token.stats.extraHp}
              widthClass="w-16"
              allowMath={false}
              onCommit={(next) =>
                onStatChange(token.id, "extraHp", clampExtraHp(next))
              }
            />
          </Row>

          <Row term="Max HP">
            <StatField
              label={`${token.name} maximum hit points`}
              value={token.stats.maxHp}
              widthClass="w-16"
              allowMath={false}
              onCommit={(next) =>
                onStatChange(token.id, "maxHp", clampMaxHp(next))
              }
            />
          </Row>
        </dl>

        <ConditionList
          conditions={token.stats.conditions}
          onChange={(next) => onConditionsChange(token.id, next)}
        />

        <ResourceList
          resources={token.stats.resources}
          onChange={(next) => onResourcesChange(token.id, next)}
        />
      </div>
    </div>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="truncate text-sm">{term}</dt>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}
