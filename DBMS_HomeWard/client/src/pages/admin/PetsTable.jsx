import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import StatusTag from '../../components/StatusTag.jsx';
import PetPhoto from '../../components/PetPhoto.jsx';
import { reviewListing } from './moderation.js';

const FILTERS = [
  ['', 'All'],
  ['approved', 'Live'],
  ['pending_review', 'In review'],
  ['changes_requested', 'Changes requested'],
  ['rejected', 'Rejected'],
];

// Every pet, from the shelter and from users, with any review status.
export default function PetsTable({ pets, reload }) {
  const [filter, setFilter] = useState('');
  const shown = filter ? pets.filter((p) => p.reviewStatus === filter) : pets;

  async function remove(pet) {
    if (!confirm(`Delete ${pet.name}? Their applications will be deleted too.`)) return;
    try {
      await api(`/pets/${pet._id}`, { method: 'DELETE' });
      toast.success(`${pet.name} deleted`);
      await reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mt-6">
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      {shown.length === 0 ? (
        <p className="py-12 text-muted">No pets here.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b-2 border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-3 pr-4">Pet</th>
                <th className="py-3 pr-4">Listed by</th>
                <th className="py-3 pr-4">Review</th>
                <th className="py-3 pr-4">Adoption</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((pet) => (
                <tr key={pet._id} className="border-b border-line">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 border-line">
                        <PetPhoto pet={pet} className="[&>span]:text-xl" />
                      </div>
                      <div>
                        <Link to={`/pets/${pet._id}`} className="font-bold hover:underline">{pet.name}</Link>
                        <p className="text-xs capitalize text-muted">{pet.species} · {pet.age} yrs · {pet.location || 'shelter'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {pet.createdBy?.role === 'admin' ? 'Shelter' : pet.createdBy?.name || 'Unknown'}
                  </td>
                  <td className="py-3 pr-4"><StatusTag status={pet.reviewStatus} /></td>
                  <td className="py-3 pr-4"><StatusTag status={pet.status} /></td>
                  <td className="py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      {pet.reviewStatus !== 'approved' && (
                        <button onClick={() => reviewListing(pet, 'approved', reload)} className="btn-primary px-3 py-1.5">
                          Approve
                        </button>
                      )}
                      {pet.reviewStatus === 'approved' && pet.createdBy?.role !== 'admin' && (
                        <button onClick={() => reviewListing(pet, 'changes_requested', reload)} className="btn-ghost px-3 py-1.5">
                          Take down
                        </button>
                      )}
                      <Link to={`/listings/${pet._id}/edit`} className="btn-outline px-3 py-1.5">Edit</Link>
                      <button onClick={() => remove(pet)} className="btn-danger px-3 py-1.5">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Row of pill buttons for filtering a list.
export function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button
          key={v || 'all'}
          onClick={() => onChange(v)}
          className={`rounded-full border-2 px-3 py-1 text-sm font-semibold transition-colors ${
            value === v ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
