import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import PetCard from '../components/PetCard.jsx';
import Spinner from '../components/Spinner.jsx';
import { useFavorites } from '../hooks/useFavorites.js';

const SPECIES = ['dog', 'cat', 'rabbit', 'bird', 'other'];
const AGE_RANGES = {
  '': ['', ''],
  young: ['0', '1'],
  adult: ['2', '7'],
  senior: ['8', '30'],
};

// The search page. Filters are stored in the URL (?species=cat&age=young)
// so a search can be bookmarked or shared.
export default function Pets() {
  const [params, setParams] = useSearchParams();
  const [name, setName] = useState(params.get('name') || '');
  const [result, setResult] = useState({ pets: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const { favoriteIds, toggleFavorite } = useFavorites();

  const species = params.get('species') || '';
  const age = params.get('age') || '';
  const status = params.get('status') ?? 'available';
  const page = Number(params.get('page') || 1);

  // Fetch pets whenever the URL filters change.
  useEffect(() => {
    const [minAge, maxAge] = AGE_RANGES[age] || ['', ''];
    const query = new URLSearchParams({
      name: params.get('name') || '',
      species,
      status,
      minAge,
      maxAge,
      page: String(page),
      limit: '12',
    });
    setLoading(true);
    api(`/pets?${query}`)
      .then(setResult)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [params, species, age, status, page]);

  // Small helper to change one filter and go back to page 1.
  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value === '' && key !== 'status') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  function handleSearch(e) {
    e.preventDefault();
    setFilter('name', name.trim());
  }

  function clearAll() {
    setName('');
    setParams({});
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Find a pet</h1>
      <p className="mt-2 text-muted">
        {loading ? 'Searching' : `${result.total} ${result.total === 1 ? 'pet' : 'pets'} match your search`}
      </p>

      {/* Filters */}
      <form onSubmit={handleSearch} className="panel mt-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="name" className="label">Name</label>
          <div className="flex gap-2">
            <input
              id="name"
              className="input"
              placeholder="Search by name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn-primary">Search</button>
          </div>
        </div>
        <div>
          <label htmlFor="species" className="label">Species</label>
          <select id="species" className="input capitalize" value={species} onChange={(e) => setFilter('species', e.target.value)}>
            <option value="">All species</option>
            {SPECIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="age" className="label">Age</label>
          <select id="age" className="input" value={age} onChange={(e) => setFilter('age', e.target.value)}>
            <option value="">Any age</option>
            <option value="young">Young (0 to 1)</option>
            <option value="adult">Adult (2 to 7)</option>
            <option value="senior">Senior (8+)</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="label">Availability</label>
          <select id="status" className="input" value={status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="adopted">Adopted</option>
            <option value="">Show all</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="button" onClick={clearAll} className="btn-ghost w-full">
            Reset
          </button>
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <Spinner label="Finding pets" />
      ) : result.pets.length === 0 ? (
        <div className="py-20 text-center">
          <h2 className="text-2xl font-extrabold">No pets match those filters</h2>
          <p className="mt-2 text-muted">Try a different species or widen the age range.</p>
          <button onClick={clearAll} className="btn-outline mt-6">Clear filters</button>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.pets.map((pet) => (
              <PetCard
                key={pet._id}
                pet={pet}
                isFavorite={favoriteIds.has(pet._id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>

          {result.pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                className="btn-outline"
                disabled={page <= 1}
                onClick={() => setFilter('page', String(page - 1))}
              >
                Previous
              </button>
              <span className="text-sm font-semibold">
                Page {page} of {result.pages}
              </span>
              <button
                className="btn-outline"
                disabled={page >= result.pages}
                onClick={() => setFilter('page', String(page + 1))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
