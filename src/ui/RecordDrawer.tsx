import type { ReactNode } from "react";
import { clampExtraHp, clampMaxHp } from "@/core/inlineMath";
import type {
  AssignableToken,
  Condition,
  NumericStatKey,
  Resource,
  TrackedRecord,
} from "@/core/types";
import ConditionList from "./ConditionList";
import ResourceList from "./ResourceList";
import StatField from "./StatField";

/** Extra popover width the second card needs, in pixels. */
export const DETAIL_WIDTH = 260;

type Props = {
  record: TrackedRecord;
  token: AssignableToken | undefined;
  /** The token currently selected on the map, if exactly one is. */
  selectedToken: AssignableToken | undefined;
  isGm: boolean;
  onStatChange: (id: string, key: NumericStatKey, value: number) => void;
  onConditionsChange: (id: string, next: Condition[]) => void;
  onResourcesChange: (id: string, next: Resource[]) => void;
  onAssign: (id: string, tokenId: string | null) => void;
  onToggleHidden: (id: string) => void;
  onDelete: (id: string) => void;
};

/**
 * A second card that opens beside the list rather than on top of it.
 *
 * App widens the Owlbear popover by exactly this card's width, so the card
 * lands in space that did not exist a moment ago and the list never reflows.
 */
export default function RecordDrawer({
  record,
  token,
  selectedToken,
  isGm,
  onStatChange,
  onConditionsChange,
  onResourcesChange,
  onAssign,
  onToggleHidden,
  onDelete,
}: Props) {
  return (
    <div
      className="flex h-full shrink-0 flex-col border-l border-ink-200 dark:border-ink-800"
      style={{ width: DETAIL_WIDTH }}
    >
      <header className="flex items-center gap-2 border-b border-ink-200 px-2 py-2 dark:border-ink-800">
        <h2
          className="min-w-0 flex-1 truncate text-sm font-medium"
          title={record.name}
        >
          {record.name || "Unnamed"}
        </h2>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <section>
          <div className="flex items-center gap-2 pb-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
              Token
            </h3>
            <div className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
          </div>

          {token === undefined ? (
            <p className="pb-1.5 text-xs text-ink-400 dark:text-ink-600">
              {record.tokenId === null
                ? "Nothing linked."
                : "Linked token is not in this scene."}
            </p>
          ) : (
            <div className="flex items-center gap-1.5 pb-1.5">
              <img
                src={token.imageUrl}
                alt=""
                draggable={false}
                className="drag-none size-6 shrink-0 rounded object-contain"
              />
              <span className="min-w-0 flex-1 truncate text-xs">
                {token.name}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            <SmallButton
              disabled={selectedToken === undefined}
              title={
                selectedToken === undefined
                  ? "Select one token on the map first"
                  : `Link ${selectedToken.name}`
              }
              onClick={() => {
                if (selectedToken !== undefined) {
                  onAssign(record.id, selectedToken.id);
                }
              }}
            >
              Link selected
            </SmallButton>
            {record.tokenId !== null && (
              <SmallButton
                title="Unlink the token — the record stays"
                onClick={() => onAssign(record.id, null)}
              >
                Unlink
              </SmallButton>
            )}
          </div>
        </section>

        {/* Extra and max share one line — two secondary numbers do not deserve
            a stacked row each when the card has lists to fit below them. */}
        <div className="flex items-center gap-2">
          <InlineStat label="Extra">
            <StatField
              label={`${record.name || "Record"} extra hit points`}
              value={record.extraHp}
              widthClass="w-12"
              allowMath={false}
              onCommit={(next) =>
                onStatChange(record.id, "extraHp", clampExtraHp(next))
              }
            />
          </InlineStat>
          <InlineStat label="Max">
            <StatField
              label={`${record.name || "Record"} maximum hit points`}
              value={record.maxHp}
              widthClass="w-12"
              allowMath={false}
              onCommit={(next) =>
                onStatChange(record.id, "maxHp", clampMaxHp(next))
              }
            />
          </InlineStat>
        </div>

        <ConditionList
          conditions={record.conditions}
          onChange={(next) => onConditionsChange(record.id, next)}
        />

        <ResourceList
          resources={record.resources}
          onChange={(next) => onResourcesChange(record.id, next)}
        />

        <section className="space-y-1 border-t border-ink-200 pt-3 dark:border-ink-800">
          {isGm && (
            <SmallButton
              title={
                record.hidden
                  ? "Players cannot see this line. Click to reveal it."
                  : "Players can see this line. Click to hide it."
              }
              active={record.hidden}
              onClick={() => onToggleHidden(record.id)}
            >
              {record.hidden ? "Hidden from players" : "Hide from players"}
            </SmallButton>
          )}

          <SmallButton
            danger
            title="Delete this record. The token itself is untouched."
            onClick={() => onDelete(record.id)}
          >
            Delete record
          </SmallButton>
        </section>
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

function SmallButton({
  children,
  onClick,
  title,
  active = false,
  danger = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-pressed={active}
      className={[
        "rounded-md px-2 py-1 text-xs transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        danger
          ? "text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950"
          : active
            ? "bg-ink-300 text-ink-900 dark:bg-ink-700 dark:text-ink-50"
            : "bg-ink-200 text-ink-700 hover:bg-ink-300 hover:text-ink-900 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700 dark:hover:text-ink-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
