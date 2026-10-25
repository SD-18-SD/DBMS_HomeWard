import { Link } from 'react-router-dom';
import StatusTag from './StatusTag.jsx';
import PetPhoto from './PetPhoto.jsx';
import { formatDate } from '../utils/format.js';

// One adoption application, as seen by the person reviewing it
// (an admin, or the user who listed the pet).
// onDecide(application, 'approved' | 'rejected') is called by the buttons.
export default function ApplicationItem({ application: a, onDecide }) {
  return (
    <li className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-line">
            {a.pet ? <PetPhoto pet={a.pet} className="[&>span]:text-2xl" /> : <div className="h-full bg-line" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-extrabold">
                {a.user?.name || 'Deleted user'} for{' '}
                {a.pet ? (
                  <Link to={`/pets/${a.pet._id}`} className="hover:underline">{a.pet.name}</Link>
                ) : (
                  'removed pet'
                )}
              </h3>
              <StatusTag status={a.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {a.user?.email} · {a.phone} · {a.homeType}
              {a.hasOtherPets ? ' · has other pets' : ''} · {formatDate(a.createdAt)}
            </p>
          </div>
        </div>
        {a.status === 'pending' && onDecide && (
          <div className="flex gap-2">
            <button onClick={() => onDecide(a, 'approved')} className="btn-primary px-3 py-1.5">Approve</button>
            <button onClick={() => onDecide(a, 'rejected')} className="btn-danger px-3 py-1.5">Reject</button>
          </div>
        )}
      </div>
      <p className="mt-3 whitespace-pre-line rounded-lg bg-cream p-3 text-sm">{a.message}</p>
      {a.adminNote && (
        <p className="mt-2 text-sm"><span className="font-semibold">Note:</span> {a.adminNote}</p>
      )}
    </li>
  );
}

// Asks for an optional note, then sends the decision. Returns true when it worked.
// eslint-disable-next-line react-refresh/only-export-components
export async function decideApplication(api, application, status) {
  const note = prompt(
    status === 'approved' ? 'Optional note for the adopter:' : 'Optional reason (the applicant will see this):',
    ''
  );
  if (note === null) return null; // Cancel pressed
  return api(`/applications/${application._id}/status`, { method: 'PATCH', body: { status, adminNote: note } });
}
