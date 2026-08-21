import { newResource, withEntry, withoutEntry } from "@/core/entries";
import type { Resource } from "@/core/types";
import { EntryName, RemoveButton, SectionHeading } from "./EntryControls";
import NumberField from "./NumberField";

type Props = {
  resources: Resource[];
  onChange: (next: Resource[]) => void;
};

const RESOURCE_MAX = 9999;

/**
 * Named counters — mana, ki, charges, arrows.
 *
 * Nothing in the extension changes these on its own; the arrows and the field
 * are the only things that move them. That is the whole difference from
 * conditions, which the round drives.
 */
export default function ResourceList({ resources, onChange }: Props) {
  const step = (resource: Resource, delta: number) =>
    onChange(
      withEntry(resources, resource.id, {
        value: Math.min(RESOURCE_MAX, Math.max(0, resource.value + delta)),
      }),
    );

  return (
    <section>
      <SectionHeading
        title="Resources"
        addLabel="Add a resource"
        onAdd={() => onChange([...resources, newResource()])}
      />

      {resources.length === 0 ? (
        <p className="py-1 text-xs text-ink-400 dark:text-ink-600">None.</p>
      ) : (
        <ul className="space-y-1">
          {resources.map((resource) => (
            <li key={resource.id} className="flex items-center gap-1">
              <EntryName
                value={resource.name}
                placeholder="Resource"
                onCommit={(name) =>
                  onChange(withEntry(resources, resource.id, { name }))
                }
              />
              <Step
                label={`Spend one ${resource.name || "resource"}`}
                direction="down"
                onClick={() => step(resource, -1)}
              />
              <NumberField
                label={`${resource.name || "Resource"} value`}
                value={resource.value}
                min={0}
                max={RESOURCE_MAX}
                onCommit={(value) =>
                  onChange(withEntry(resources, resource.id, { value }))
                }
              />
              <Step
                label={`Regain one ${resource.name || "resource"}`}
                direction="up"
                onClick={() => step(resource, 1)}
              />
              <RemoveButton
                label={`Remove ${resource.name || "resource"}`}
                onClick={() => onChange(withoutEntry(resources, resource.id))}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Step({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: "up" | "down";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "flex size-5 shrink-0 items-center justify-center rounded",
        "text-ink-400 transition-colors hover:bg-ink-200 hover:text-ink-900",
        "dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-50",
      ].join(" ")}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={direction === "down" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
      </svg>
    </button>
  );
}
