import { STATUS_LABELS, type Filter } from "../types.ts";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value: value as Filter, label })),
];

type Props = {
  value: Filter;
  onChange: (value: Filter) => void;
};

export function FilterTabs({ value, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Filter tasks" className="tabs">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          role="tab"
          aria-selected={value === f.value}
          onClick={() => onChange(f.value)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
