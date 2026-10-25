import { photoUrl } from '../api/client.js';

// Background colors for pets without a photo, picked by species.
const FALLBACK = {
  dog: 'bg-sun',
  cat: 'bg-sage',
  rabbit: 'bg-line',
  bird: 'bg-forest text-paper',
  other: 'bg-clay text-paper',
};

// Shows one of the pet's photos (the first by default),
// or a big initial letter when there is no photo.
export default function PetPhoto({ pet, index = 0, className = '' }) {
  const src = pet.photos?.[index];
  if (src) {
    return (
      <img
        src={photoUrl(src)}
        alt={`${pet.name} the ${pet.species}`}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${FALLBACK[pet.species] || 'bg-line'} ${className}`}
      aria-label={`${pet.name} has no photo yet`}
    >
      <span className="font-display text-7xl font-extrabold opacity-80">{pet.name?.[0]}</span>
    </div>
  );
}
