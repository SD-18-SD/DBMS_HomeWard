// A simple loading indicator.
export default function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-line border-t-forest" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
