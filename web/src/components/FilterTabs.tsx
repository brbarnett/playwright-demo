import { FILTER_OPTIONS, type Filter } from "../types.ts";

type Props = {
  value: Filter;
  onChange: (value: Filter) => void;
};

export function FilterTabs({ value, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Filter tasks" className="tabs">
      {FILTER_OPTIONS.map((f) => (
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
