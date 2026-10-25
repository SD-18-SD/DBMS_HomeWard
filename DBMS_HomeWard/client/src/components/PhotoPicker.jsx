import { useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { photoUrl } from '../api/client.js';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

// Lets the user pick up to `max` photos.
// existing: photo paths already saved on the server (for edit forms)
// files:    new File objects picked in this session
// The parent keeps both lists in state and sends them when the form is submitted.
export default function PhotoPicker({ existing, setExisting, files, setFiles, max = 5 }) {
  const total = existing.length + files.length;

  // Temporary preview URLs for new files.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function pick(e) {
    const chosen = Array.from(e.target.files || []);
    e.target.value = ''; // lets the same file be picked again later
    const valid = [];
    for (const file of chosen) {
      if (!TYPES.includes(file.type)) toast.error(`${file.name}: use JPG, PNG or WEBP`);
      else if (file.size > MAX_BYTES) toast.error(`${file.name} is larger than 2 MB`);
      else valid.push(file);
    }
    const room = max - total;
    if (valid.length > room) toast.error(`Only ${max} photos allowed. Extra files were skipped.`);
    setFiles([...files, ...valid.slice(0, Math.max(0, room))]);
  }

  const tiles = [
    ...existing.map((path) => ({ key: path, src: photoUrl(path), remove: () => setExisting(existing.filter((p) => p !== path)) })),
    ...files.map((file, i) => ({ key: previews[i], src: previews[i], remove: () => setFiles(files.filter((f) => f !== file)) })),
  ];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">Photos</span>
        <span className="text-xs font-semibold text-muted">
          {total} of {max}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t, i) => (
          <div key={t.key} className="relative aspect-square overflow-hidden rounded-xl border-2 border-line">
            <img src={t.src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-ink px-1.5 py-0.5 text-[11px] font-bold text-paper">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={t.remove}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-paper text-ink hover:bg-clay hover:text-paper"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" fill="none">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        ))}

        {total < max && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink bg-paper text-center text-xs font-semibold text-muted hover:bg-sage">
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="mt-1">Add</span>
            <input type="file" multiple accept={TYPES.join(',')} className="sr-only" onChange={pick} />
          </label>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">JPG, PNG or WEBP, up to 2 MB each. The first photo is the cover.</p>
    </div>
  );
}

// Adds the photo lists to a FormData before sending.
// eslint-disable-next-line react-refresh/only-export-components
export function appendPhotos(form, existing, files, isEdit) {
  if (isEdit) form.append('keepPhotos', JSON.stringify(existing));
  files.forEach((file) => form.append('photos', file));
}
