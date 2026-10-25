import { Link } from 'react-router-dom';
import PetPhoto from '../../components/PetPhoto.jsx';
import { CampaignImage, CATEGORY_LABELS } from '../../components/CampaignCard.jsx';
import { ageLabel } from '../../components/PetCard.jsx';
import { formatDate, formatMoney } from '../../utils/format.js';
import { reviewListing, setCampaignStatus } from './moderation.js';

// Everything users submitted that is waiting for an admin decision.
export default function ReviewQueue({ listings, campaigns, reload }) {
  if (listings.length === 0 && campaigns.length === 0) {
    return <p className="py-16 text-center text-lg text-muted">Nothing to review. All caught up.</p>;
  }

  return (
    <div className="mt-6 space-y-10">
      {listings.length > 0 && (
        <section>
          <h2 className="text-2xl font-extrabold">Pet listings ({listings.length})</h2>
          <ul className="mt-4 space-y-4">
            {listings.map((pet) => (
              <li key={pet._id} className="panel p-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex gap-2">
                    {(pet.photos.length ? pet.photos : [null]).slice(0, 3).map((_, i) => (
                      <div key={i} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-line">
                        <PetPhoto pet={pet} index={i} className="[&>span]:text-3xl" />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-extrabold">
                      <Link to={`/pets/${pet._id}`} className="hover:underline">{pet.name}</Link>
                    </h3>
                    <p className="text-sm text-muted">
                      {pet.breed} {pet.species} · {pet.gender} · {ageLabel(pet.age)} · {pet.location || 'no location'}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      By {pet.createdBy?.name || 'unknown'} · {pet.contact?.phone} · {pet.photos.length} photos · sent{' '}
                      {formatDate(pet.updatedAt)}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm">{pet.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-line pt-4">
                  <button onClick={() => reviewListing(pet, 'approved', reload)} className="btn-primary px-3 py-1.5">Approve</button>
                  <button onClick={() => reviewListing(pet, 'changes_requested', reload)} className="btn-outline px-3 py-1.5">
                    Request edits
                  </button>
                  <button onClick={() => reviewListing(pet, 'rejected', reload)} className="btn-danger px-3 py-1.5">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {campaigns.length > 0 && (
        <section>
          <h2 className="text-2xl font-extrabold">Fundraisers ({campaigns.length})</h2>
          <ul className="mt-4 space-y-4">
            {campaigns.map((c) => (
              <li key={c._id} className="panel p-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="h-24 w-36 shrink-0 overflow-hidden rounded-xl border-2 border-line">
                    <CampaignImage campaign={c} className="[&>span]:text-lg" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-extrabold">
                      <Link to={`/campaigns/${c._id}`} className="hover:underline">{c.title}</Link>
                    </h3>
                    <p className="text-sm text-muted">
                      {CATEGORY_LABELS[c.category]} · goal {formatMoney(c.goalAmount)} · ends {formatDate(c.endDate)}
                      {c.pet ? ` · for ${c.pet.name}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-muted">By {c.createdBy?.name} ({c.createdBy?.email})</p>
                    <p className="mt-2 line-clamp-3 text-sm">{c.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-line pt-4">
                  <button onClick={() => setCampaignStatus(c, 'active', reload)} className="btn-primary px-3 py-1.5">Approve</button>
                  <button onClick={() => setCampaignStatus(c, 'rejected', reload)} className="btn-danger px-3 py-1.5">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
