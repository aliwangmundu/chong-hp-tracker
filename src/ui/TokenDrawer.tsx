import type { ReactNode } from "react";
import { clampExtraHp, clampMaxHp } from "@/core/inlineMath";
import type { NumericStatKey, TrackedToken } from "@/core/types";
import StatField from "./StatField";

/** Extra popover width the second card needs, in pixels. */
export const DETAIL_WIDTH = 240;

type Props = {
  token: TrackedToken | null;
  onClose: () => void;
  onStatChange: (id: string, key: NumericStatKey, value: number) => void;
};

/**
 * A second card that opens beside the list rather than on top of it.
 *
 * App widens the Owlbear popover by exactly this card's width when it appears,
 * so the token list stays fully visible and keeps working while you edit here.
 */
export default function TokenDrawer({ token, onClose, onStatChange }: Props) {
  return (
    <div
      className="flex h-full shrink-0 flex-col border-l border-ink-200 dark:border-ink-800"
      style={{ width: DETAIL_WIDTH }}
    >
      <header className="flex items-center gap-2 border-b border-ink-200 px-2 py-2 dark:border-ink-800">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close extra stats"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-900 dark:hover:text-ink-100"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {token !== null && (
          <>
            <img
              src={token.imageUrl}
              alt=""
              draggable={false}
              className="drag-none size-7 shrink-0 rounded object-contain"
            />
            <h2 className="truncate text-sm font-medium" title={token.name}>
              {token.name || "Unnamed"}
            </h2>
          </>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {token !== null && (
          <dl className="space-y-4">
            <Row
              term="Extra HP"
              hint="Temporary hit points. Added to the number on the token."
            >
              <StatField
                label={`${token.name} extra hit points`}
                value={token.stats.extraHp}
                widthClass="w-20"
                allowMath={false}
                onCommit={(next) =>
                  onStatChange(token.id, "extraHp", clampExtraHp(next))
                }
              />
            </Row>

            <Row
              term="Max HP"
              hint="Caps the HP field. Never drawn on the map. 0 means no cap."
            >
              <StatField
                label={`${token.name} maximum hit points`}
                value={token.stats.maxHp}
                widthClass="w-20"
                allowMath={false}
                onCommit={(next) =>
                  onStatChange(token.id, "maxHp", clampMaxHp(next))
                }
              />
            </Row>
          </dl>
        )}
      </div>
    </div>
  );
}

function Row({
  term,
  hint,
  children,
}: {
  term: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className="text-sm font-medium">{term}</dt>
        <dd className="mt-0.5 text-xs leading-snug text-ink-400 dark:text-ink-500">
          {hint}
        </dd>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}
