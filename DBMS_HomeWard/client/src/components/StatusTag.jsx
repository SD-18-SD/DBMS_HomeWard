// Small colored label for pet, review, application and campaign status.
const STYLES = {
  // adoption + application
  available: 'bg-forest text-paper',
  pending: 'bg-sun text-ink',
  adopted: 'bg-ink text-paper',
  approved: 'bg-forest text-paper',
  rejected: 'bg-clay text-paper',
  // moderation
  pending_review: 'bg-sun text-ink',
  changes_requested: 'bg-clay-dark text-paper',
  // campaigns
  active: 'bg-forest text-paper',
  paused: 'bg-line text-ink',
  closed: 'bg-ink text-paper',
};

const LABELS = {
  pending_review: 'In review',
  changes_requested: 'Changes requested',
};

export default function StatusTag({ status }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${
        LABELS[status] ? '' : 'capitalize'
      } ${STYLES[status] || 'bg-line text-ink'}`}
    >
      {LABELS[status] || status}
    </span>
  );
}
