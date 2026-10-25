import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import StatusTag from '../../components/StatusTag.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';
import { formatDate, formatMoney } from '../../utils/format.js';
import { FilterChips } from './PetsTable.jsx';
import { setCampaignStatus } from './moderation.js';

const FILTERS = [
  ['', 'All'],
  ['pending_review', 'In review'],
  ['active', 'Active'],
  ['paused', 'Paused'],
  ['closed', 'Closed'],
  ['rejected', 'Rejected'],
];

// Which buttons to show for each status. [status to set, label, button style]
const ACTIONS = {
  pending_review: [['active', 'Approve', 'btn-primary'], ['rejected', 'Reject', 'btn-danger']],
  active: [['paused', 'Pause', 'btn-outline'], ['closed', 'Close', 'btn-outline']],
  paused: [['active', 'Resume', 'btn-primary'], ['closed', 'Close', 'btn-outline']],
  rejected: [['active', 'Approve', 'btn-primary']],
  closed: [['active', 'Reopen', 'btn-outline']],
};

export default function CampaignsTable({ campaigns, reload }) {
  const [filter, setFilter] = useState('');
  const shown = filter ? campaigns.filter((c) => c.status === filter) : campaigns;

  async function remove(c) {
    const warning = c.raisedAmount > 0 ? ` It has ${formatMoney(c.raisedAmount)} in donations; donors keep them in their history.` : '';
    if (!confirm(`Remove "${c.title}" permanently?${warning}`)) return;
    try {
      await api(`/campaigns/${c._id}`, { method: 'DELETE' });
      toast.success('Fundraiser removed');
      await reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mt-6">
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      {shown.length === 0 ? (
        <p className="py-12 text-muted">No fundraisers here.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b-2 border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-3 pr-4">Fundraiser</th>
                <th className="w-48 py-3 pr-4">Progress</th>
                <th className="py-3 pr-4">Ends</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c._id} className="border-b border-line align-top">
                  <td className="py-3 pr-4">
                    <Link to={`/campaigns/${c._id}`} className="font-bold hover:underline">{c.title}</Link>
                    <p className="text-xs text-muted">By {c.createdBy?.name || 'deleted user'}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <ProgressBar raised={c.raisedAmount} goal={c.goalAmount} />
                    <p className="mt-1 text-xs text-muted">
                      {formatMoney(c.raisedAmount)} / {formatMoney(c.goalAmount)} · {c.donorCount} donors
                    </p>
                  </td>
                  <td className="py-3 pr-4">{formatDate(c.endDate)}</td>
                  <td className="py-3 pr-4"><StatusTag status={c.status} /></td>
                  <td className="py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      {ACTIONS[c.status].map(([status, label, style]) => (
                        <button key={status} onClick={() => setCampaignStatus(c, status, reload)} className={`${style} px-3 py-1.5`}>
                          {label}
                        </button>
                      ))}
                      <Link to={`/campaigns/${c._id}/edit`} className="btn-ghost px-3 py-1.5">Edit</Link>
                      <button onClick={() => remove(c)} className="btn-danger px-3 py-1.5">Remove</button>
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
