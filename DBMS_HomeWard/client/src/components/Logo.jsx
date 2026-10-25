import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-ink">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#2E5641" />
        <path d="M8 17 16 9l8 8v7a1 1 0 0 1-1 1h-5v-5h-4v5H9a1 1 0 0 1-1-1z" fill="#F5EFE3" />
      </svg>
      <span className="font-display text-xl font-extrabold tracking-tight">Homeward</span>
    </Link>
  );
}
