import { percent } from '../utils/format.js';

// Horizontal bar that fills up as money is raised.
export default function ProgressBar({ raised, goal, size = 'md' }) {
  const value = percent(raised, goal);
  return (
    <div
      className={`w-full overflow-hidden rounded-full border-2 border-ink bg-paper ${size === 'lg' ? 'h-5' : 'h-3'}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={`${value}% of goal raised`}
    >
      <div className="h-full bg-forest" style={{ width: `${value}%` }} />
    </div>
  );
}
