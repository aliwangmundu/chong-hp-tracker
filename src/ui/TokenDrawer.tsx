import type { ReactNode } from "react";
import { clampExtraHp, clampMaxHp } from "@/core/inlineMath";
import type { NumericStatKey, TrackedToken } from "@/core/types";
import StatField from "./StatField";

/** Extra popover width the second card needs, in pixels. */
export const DETAIL_WIDTH = 220;

/** Keep in step with the transition duration on the card. */
export const DETAIL_TRANSITION_MS = 200;

type Props = {
  token: TrackedToken;
  /** False for the frame it mounts on and while it is leaving. */
  shown: boolean;
  onClose: () => void;
  onStatChange: (id: string, key: NumericStatKey, value: number) => void;
};

/**
 * A second card that opens beside the list rather than on top of it.
 *
 * App widens the Owlbear popover by exactly this card's width, then flips
 * `shown` so the card slides into the space that just appeared. The popover
 * resize itself cannot animate, so the card's own movement is what sells it.
 */
export default function TokenDrawer({
  token,
  shown,
  onClose,
  onStatChange,
}: Props) {
  return (
    <div
      className={[
        "flex h-full shrink-0 flex-col border-l",
        "border-ink-200 dark:border-ink-800",
        "transition-[transform,opacity] duration-200 ease-out",
        shown ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
      ].join(" ")}
      style={{ width: DETAIL_WIDTH }}
    >
      <header className="flex items-center gap-2 border-b border-ink-200 px-2 py-2 dark:border-ink-800">
        <img
          src={token.imageUrl}
          alt=""
          draggable={false}
          className="drag-none size-6 shrink-0 rounded object-contain"
        />
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium" title={token.name}>
          {token.name || "Unnamed"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close extra stats"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-900 dark:hover:text-ink-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
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
