import { MAX_DURATION, newCondition, withEntry, withoutEntry } from "@/core/entries";
import type { Condition } from "@/core/types";
import { EntryName, RemoveButton, SectionHeading } from "./EntryControls";
import NumberField from "./NumberField";

type Props = {
  conditions: Condition[];
  onChange: (next: Condition[]) => void;
};

/**
 * Named effects with a round countdown.
 *
 * A duration of 0 is drawn in red rather than removed. The round tracker only
 * counts; deciding an effect has actually ended is the GM's call, and it means
 * stepping the round back restores what stepping forward did.
 */
export default function ConditionList({ conditions, onChange }: Props) {
  return (
    <section>
      <SectionHeading
        title="Conditions"
        addLabel="Add a condition"
        onAdd={() => onChange([...conditions, newCondition()])}
      />

      {conditions.length === 0 ? (
        <p className="py-1 text-xs text-ink-400 dark:text-ink-600">None.</p>
      ) : (
        <ul className="space-y-1">
          {conditions.map((condition) => (
            <li key={condition.id} className="flex items-center gap-1">
              <EntryName
                value={condition.name}
                placeholder="Condition"
                onCommit={(name) =>
                  onChange(withEntry(conditions, condition.id, { name }))
                }
              />
              <NumberField
                label={`${condition.name || "Condition"} duration`}
                value={condition.duration}
                min={0}
                max={MAX_DURATION}
                expired={condition.duration === 0}
                onCommit={(duration) =>
                  onChange(withEntry(conditions, condition.id, { duration }))
                }
              />
              <RemoveButton
                label={`Remove ${condition.name || "condition"}`}
                onClick={() => onChange(withoutEntry(conditions, condition.id))}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
