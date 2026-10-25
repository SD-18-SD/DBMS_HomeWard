// Heart button for saving a pet. Drawn with a plain inline SVG.
export default function FavoriteButton({ active, onClick, withText = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Save to favorites'}
      className={`inline-flex items-center gap-2 rounded-full border-2 px-2.5 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-clay bg-clay text-paper hover:bg-clay-dark'
          : 'border-ink bg-paper text-ink hover:bg-sage'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {withText && <span className="pr-1">{active ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
