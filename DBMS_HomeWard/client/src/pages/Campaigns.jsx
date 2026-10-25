import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import CampaignCard, { CATEGORY_LABELS } from '../components/CampaignCard.jsx';
import Spinner from '../components/Spinner.jsx';
import Tabs from '../components/Tabs.jsx';

// Public list of fundraising campaigns. Filters live in the URL like the pet search.
export default function Campaigns() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [result, setResult] = useState({ campaigns: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const status = params.get('status') === 'closed' ? 'closed' : 'active';
  const category = params.get('category') || '';
  const page = Number(params.get('page') || 1);

  useEffect(() => {
    const query = new URLSearchParams({ status, category, q: params.get('q') || '', page: String(page) });
    setLoading(true);
    api(`/campaigns?${query}`)
      .then(setResult)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [params, status, category, page]);

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Fundraisers</h1>
          <p className="mt-2 max-w-xl text-muted">
            Surgery, food, a dry roof, an emergency vet visit. Every campaign is checked by our team before it goes live.
          </p>
        </div>
        <Link to="/campaigns/new" className="btn-accent">Start a fundraiser</Link>
      </div>

      <div className="mt-8">
        <Tabs
          active={status}
          onChange={(s) => setFilter('status', s === 'active' ? '' : s)}
          tabs={[
            { id: 'active', label: 'Open now' },
            { id: 'closed', label: 'Completed' },
          ]}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFilter('q', q.trim());
        }}
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="label">Search</label>
          <input id="q" className="input" placeholder="Search by title" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label htmlFor="category" className="label">Category</label>
          <select id="category" className="input" value={category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary">Search</button>
      </form>

      {loading ? (
        <Spinner label="Loading fundraisers" />
      ) : result.campaigns.length === 0 ? (
        <p className="py-20 text-center text-lg text-muted">No fundraisers match.</p>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.campaigns.map((c) => (
              <CampaignCard key={c._id} campaign={c} />
            ))}
          </div>
          {result.pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button className="btn-outline" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>
                Previous
              </button>
              <span className="text-sm font-semibold">Page {page} of {result.pages}</span>
              <button className="btn-outline" disabled={page >= result.pages} onClick={() => setFilter('page', String(page + 1))}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
