import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import Tabs from '../../components/Tabs.jsx';
import Spinner from '../../components/Spinner.jsx';
import ReviewQueue from './ReviewQueue.jsx';
import PetsTable from './PetsTable.jsx';
import ApplicationsList from './ApplicationsList.jsx';
import CampaignsTable from './CampaignsTable.jsx';
import UsersTable from './UsersTable.jsx';

const TABS = ['review', 'applications', 'pets', 'campaigns', 'users'];

// Admin home. Loads everything once, then each tab gets the data it needs.
export default function AdminDashboard() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'review';

  const [pets, setPets] = useState([]);
  const [applications, setApplications] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [p, a, c, u] = await Promise.all([
      api('/pets/manage?limit=100'),
      api('/applications'),
      api('/campaigns/manage'),
      api('/users'),
    ]);
    setPets(p.pets);
    setApplications(a.applications);
    setCampaigns(c.campaigns);
    setUsers(u.users);
  }, []);

  useEffect(() => {
    reload()
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [reload]);

  const listingsToReview = pets.filter((p) => p.reviewStatus === 'pending_review');
  const campaignsToReview = campaigns.filter((c) => c.status === 'pending_review');
  const pendingApplications = applications.filter((a) => a.status === 'pending').length;

  const stats = [
    ['Pets live', pets.filter((p) => p.reviewStatus === 'approved').length],
    ['Waiting for review', listingsToReview.length + campaignsToReview.length],
    ['Applications to answer', pendingApplications],
    ['Active fundraisers', campaigns.filter((c) => c.status === 'active').length],
  ];

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Admin dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/listings/new" className="btn-accent">Add a pet</Link>
          <Link to="/campaigns/new" className="btn-outline">New fundraiser</Link>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border-2 border-ink bg-ink lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-paper p-5">
            <dt className="text-sm font-semibold text-muted">{label}</dt>
            <dd className="mt-1 font-display text-4xl font-extrabold">{loading ? '-' : value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10">
        <Tabs
          active={tab}
          onChange={(t) => setParams(t === 'review' ? {} : { tab: t })}
          tabs={[
            { id: 'review', label: 'Review queue', count: listingsToReview.length + campaignsToReview.length },
            { id: 'applications', label: 'Applications', count: pendingApplications },
            { id: 'pets', label: 'Pets', count: pets.length },
            { id: 'campaigns', label: 'Fundraisers', count: campaigns.length },
            { id: 'users', label: 'Users', count: users.length },
          ]}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'review' ? (
        <ReviewQueue listings={listingsToReview} campaigns={campaignsToReview} reload={reload} />
      ) : tab === 'applications' ? (
        <ApplicationsList applications={applications} reload={reload} />
      ) : tab === 'pets' ? (
        <PetsTable pets={pets} reload={reload} />
      ) : tab === 'campaigns' ? (
        <CampaignsTable campaigns={campaigns} reload={reload} />
      ) : (
        <UsersTable users={users} setUsers={setUsers} />
      )}
    </div>
  );
}
