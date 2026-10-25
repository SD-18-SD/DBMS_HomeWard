import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import ApplicationItem, { decideApplication } from '../../components/ApplicationItem.jsx';
import { FilterChips } from './PetsTable.jsx';

const FILTERS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['', 'All'],
];

// Every adoption application on the site, for shelter pets and user listings.
export default function ApplicationsList({ applications, reload }) {
  const [filter, setFilter] = useState('pending');
  const shown = filter ? applications.filter((a) => a.status === filter) : applications;

  async function decide(application, status) {
    try {
      const res = await decideApplication(api, application, status);
      if (!res) return;
      toast.success(`Application ${status}`);
      await reload(); // approving one also rejects the others for that pet
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mt-6">
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      {shown.length === 0 ? (
        <p className="py-12 text-muted">Nothing here.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((a) => (
            <ApplicationItem key={a._id} application={a} onDecide={decide} />
          ))}
        </ul>
      )}
    </div>
  );
}
