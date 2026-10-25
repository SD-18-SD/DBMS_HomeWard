import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import Tabs from '../components/Tabs.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusTag from '../components/StatusTag.jsx';
import PetPhoto from '../components/PetPhoto.jsx';
import PetCard from '../components/PetCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import ApplicationItem, { decideApplication } from '../components/ApplicationItem.jsx';
import { CampaignImage } from '../components/CampaignCard.jsx';
import { formatDate, formatMoney } from '../utils/format.js';

const TABS = ['applications', 'favorites', 'listings', 'campaigns', 'donations'];

// The user's own page. The open tab is kept in the URL (?tab=listings)
// so other pages can link straight to it.
export default function Dashboard() {
  const { user } = useAuth();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'applications';

  const [data, setData] = useState({
    applications: [],
    favorites: [],
    listings: [],
    received: [],
    campaigns: [],
    donations: [],
    donationTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/applications/mine'),
      api('/users/favorites'),
      api('/pets/mine'),
      api('/applications/received'),
      api('/campaigns/mine'),
      api('/campaigns/donations/mine'),
    ])
      .then(([a, f, l, r, c, d]) =>
        setData({
          applications: a.applications,
          favorites: f.favorites,
          listings: l.pets,
          received: r.applications,
          campaigns: c.campaigns,
          donations: d.donations,
          donationTotal: d.total,
        })
      )
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (key, fn) => setData((d) => ({ ...d, [key]: fn(d[key]) }));
  const visibleFavorites = data.favorites.filter((p) => favoriteIds.has(p._id));
  const pendingReceived = data.received.filter((a) => a.status === 'pending').length;

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">Hi, {user.name.split(' ')[0]}</h1>
          <p className="mt-2 text-muted">
            {data.applications.length} applications sent · {data.listings.length} pets listed · {formatMoney(data.donationTotal)} donated
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/listings/new" className="btn-primary">List a pet</Link>
          <Link to="/campaigns/new" className="btn-outline">Start a fundraiser</Link>
        </div>
      </div>

      <div className="mt-8">
        <Tabs
          active={tab}
          onChange={(t) => setParams(t === 'applications' ? {} : { tab: t })}
          tabs={[
            { id: 'applications', label: 'My applications', count: data.applications.length },
            { id: 'favorites', label: 'Saved pets', count: visibleFavorites.length },
            { id: 'listings', label: 'My listings', count: data.listings.length },
            { id: 'campaigns', label: 'My fundraisers', count: data.campaigns.length },
            { id: 'donations', label: 'Donations', count: data.donations.length },
          ]}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'applications' ? (
        <MyApplications applications={data.applications} update={update} />
      ) : tab === 'favorites' ? (
        visibleFavorites.length === 0 ? (
          <Empty text="Tap the heart on any pet to save it here." to="/pets" action="Browse pets" />
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFavorites.map((pet) => (
              <PetCard key={pet._id} pet={pet} isFavorite onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        )
      ) : tab === 'listings' ? (
        <MyListings listings={data.listings} received={data.received} pendingReceived={pendingReceived} update={update} />
      ) : tab === 'campaigns' ? (
        <MyCampaigns campaigns={data.campaigns} update={update} />
      ) : (
        <MyDonations donations={data.donations} total={data.donationTotal} />
      )}
    </div>
  );
}

/* ---------- Applications I sent ---------- */
function MyApplications({ applications, update }) {
  async function withdraw(id) {
    if (!confirm('Withdraw this application?')) return;
    try {
      await api(`/applications/${id}`, { method: 'DELETE' });
      update('applications', (list) => list.filter((a) => a._id !== id));
      toast.success('Application withdrawn');
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (applications.length === 0) {
    return <Empty text="You have not applied for any pets yet." to="/pets" action="Browse pets" />;
  }
  return (
    <ul className="mt-6 space-y-3">
      {applications.map((a) => (
        <li key={a._id} className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-line">
            {a.pet ? <PetPhoto pet={a.pet} /> : <div className="h-full bg-line" />}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-extrabold">
                {a.pet ? <Link to={`/pets/${a.pet._id}`} className="hover:underline">{a.pet.name}</Link> : 'Removed pet'}
              </h2>
              <StatusTag status={a.status} />
            </div>
            <p className="mt-1 text-sm text-muted">Sent {formatDate(a.createdAt)} · Home: {a.homeType}</p>
            {a.adminNote && (
              <p className="mt-2 text-sm"><span className="font-semibold">Reply:</span> {a.adminNote}</p>
            )}
          </div>
          {a.status === 'pending' && (
            <button onClick={() => withdraw(a._id)} className="btn-danger self-start sm:self-center">Withdraw</button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------- Pets I listed + applications for them ---------- */
function MyListings({ listings, received, pendingReceived, update }) {
  async function remove(pet) {
    if (!confirm(`Delete the listing for ${pet.name}? Applications for it will be deleted too.`)) return;
    try {
      await api(`/pets/${pet._id}`, { method: 'DELETE' });
      update('listings', (list) => list.filter((p) => p._id !== pet._id));
      update('received', (list) => list.filter((a) => a.pet?._id !== pet._id));
      toast.success('Listing deleted');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function decide(application, status) {
    try {
      const res = await decideApplication(api, application, status);
      if (!res) return;
      // Reload, because approving one application changes the others for that pet.
      const [r, l] = await Promise.all([api('/applications/received'), api('/pets/mine')]);
      update('received', () => r.applications);
      update('listings', () => l.pets);
      toast.success(`Application ${status}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (listings.length === 0) {
    return <Empty text="Need to rehome a pet? List it and our team will review it." to="/listings/new" action="List a pet" />;
  }

  return (
    <div className="mt-6 space-y-10">
      <ul className="space-y-3">
        {listings.map((pet) => (
          <li key={pet._id} className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-line">
              <PetPhoto pet={pet} className="[&>span]:text-3xl" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold">
                  <Link to={`/pets/${pet._id}`} className="hover:underline">{pet.name}</Link>
                </h2>
                <StatusTag status={pet.reviewStatus} />
                {pet.reviewStatus === 'approved' && <StatusTag status={pet.status} />}
              </div>
              <p className="mt-1 text-sm text-muted">
                Listed {formatDate(pet.createdAt)} · {pet.photos.length} photos ·{' '}
                {received.filter((a) => a.pet?._id === pet._id).length} applications
              </p>
              {pet.reviewStatus === 'pending_review' && (
                <p className="mt-2 text-sm">Waiting for an admin to check it. It is hidden from search until then.</p>
              )}
              {pet.reviewNote && pet.reviewStatus !== 'approved' && (
                <p className="mt-2 text-sm">
                  <span className="font-semibold">Admin note:</span> {pet.reviewNote}
                </p>
              )}
            </div>
            <div className="flex gap-2 self-start">
              <Link to={`/listings/${pet._id}/edit`} className="btn-outline px-3 py-1.5">Edit</Link>
              <button onClick={() => remove(pet)} className="btn-danger px-3 py-1.5">Delete</button>
            </div>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="text-2xl font-extrabold">
          Applications for your pets
          {pendingReceived > 0 && <span className="ml-2 text-base font-semibold text-clay">{pendingReceived} waiting</span>}
        </h2>
        {received.length === 0 ? (
          <p className="mt-3 text-muted">Nobody has applied yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {received.map((a) => (
              <ApplicationItem key={a._id} application={a} onDecide={decide} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------- Campaigns I started ---------- */
function MyCampaigns({ campaigns, update }) {
  async function remove(c) {
    if (!confirm(`Delete "${c.title}"?`)) return;
    try {
      await api(`/campaigns/${c._id}`, { method: 'DELETE' });
      update('campaigns', (list) => list.filter((x) => x._id !== c._id));
      toast.success('Fundraiser deleted');
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (campaigns.length === 0) {
    return <Empty text="Raise money for a pet's surgery, food or shelter." to="/campaigns/new" action="Start a fundraiser" />;
  }
  return (
    <ul className="mt-6 space-y-3">
      {campaigns.map((c) => (
        <li key={c._id} className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-line">
            <CampaignImage campaign={c} className="[&>span]:text-base" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold">
                <Link to={`/campaigns/${c._id}`} className="hover:underline">{c.title}</Link>
              </h2>
              <StatusTag status={c.status} />
            </div>
            <div className="mt-2 max-w-md">
              <ProgressBar raised={c.raisedAmount} goal={c.goalAmount} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {formatMoney(c.raisedAmount)} of {formatMoney(c.goalAmount)} · {c.donorCount} donors · ends {formatDate(c.endDate)}
            </p>
            {c.reviewNote && c.status === 'rejected' && (
              <p className="mt-1 text-sm"><span className="font-semibold">Admin note:</span> {c.reviewNote}</p>
            )}
          </div>
          <div className="flex gap-2 self-start sm:self-center">
            {c.status !== 'closed' && <Link to={`/campaigns/${c._id}/edit`} className="btn-outline px-3 py-1.5">Edit</Link>}
            {c.raisedAmount === 0 && <button onClick={() => remove(c)} className="btn-danger px-3 py-1.5">Delete</button>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- My donation history ---------- */
function MyDonations({ donations, total }) {
  if (donations.length === 0) {
    return <Empty text="Your donations will show up here." to="/campaigns" action="See fundraisers" />;
  }
  return (
    <div className="mt-6">
      <p className="text-lg">
        You have given <span className="font-extrabold">{formatMoney(total)}</span> across {donations.length} donations.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b-2 border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-3 pr-4">Date</th>
              <th className="py-3 pr-4">Fundraiser</th>
              <th className="py-3 pr-4">Shown as</th>
              <th className="py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d._id} className="border-b border-line">
                <td className="py-3 pr-4">{formatDate(d.createdAt)}</td>
                <td className="py-3 pr-4 font-semibold">
                  {d.campaign ? (
                    <Link to={`/campaigns/${d.campaign._id}`} className="hover:underline">{d.campaign.title}</Link>
                  ) : (
                    <span className="text-muted">Removed fundraiser</span>
                  )}
                </td>
                <td className="py-3 pr-4">{d.isAnonymous ? 'Anonymous' : 'Your name'}</td>
                <td className="py-3 text-right font-bold">{formatMoney(d.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Empty({ text, to, action }) {
  return (
    <div className="py-16 text-center">
      <p className="text-lg text-muted">{text}</p>
      <Link to={to} className="btn-primary mt-6">{action}</Link>
    </div>
  );
}
