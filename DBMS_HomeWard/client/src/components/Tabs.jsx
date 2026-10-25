// Simple tab buttons. tabs = [{ id, label, count }]
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 border-b-2 border-line" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-0.5 border-b-4 px-4 py-3 text-sm font-bold transition-colors ${
            active === t.id ? 'border-clay text-ink' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span className="ml-2 rounded-full bg-sage px-2 py-0.5 text-xs text-ink">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
