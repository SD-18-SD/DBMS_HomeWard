import { Link } from 'react-router-dom';
import PetPhoto from './PetPhoto.jsx';
import StatusTag from './StatusTag.jsx';
import FavoriteButton from './FavoriteButton.jsx';

export function ageLabel(age) {
  if (age < 1) return 'Under 1 year';
  return `${age} ${age === 1 ? 'year' : 'years'}`;
}

// One pet in the grid. Clicking it opens the detail page.
export default function PetCard({ pet, isFavorite, onToggleFavorite }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border-2 border-line bg-paper transition-colors hover:border-ink">
      <Link to={`/pets/${pet._id}`} className="block">
        <div className="aspect-[4/3] overflow-hidden border-b-2 border-line">
          <PetPhoto pet={pet} />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-2xl font-extrabold">{pet.name}</h3>
            <StatusTag status={pet.status} />
          </div>
          <p className="mt-1 text-sm capitalize text-muted">
            {pet.breed} {pet.species} · {pet.gender} · {ageLabel(pet.age)}
          </p>
          {pet.location && <p className="mt-1 text-sm font-semibold text-ink">{pet.location}</p>}
        </div>
      </Link>
      {onToggleFavorite && (
        <div className="absolute right-3 top-3">
          <FavoriteButton active={isFavorite} onClick={() => onToggleFavorite(pet._id)} />
        </div>
      )}
    </article>
  );
}
