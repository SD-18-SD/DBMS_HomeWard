import { Link } from 'react-router-dom';
import { photoUrl } from '../api/client.js';
import { daysLeft, formatMoney, percent } from '../utils/format.js';
import ProgressBar from './ProgressBar.jsx';

export const CATEGORY_LABELS = {
  medical: 'Medical care',
  food: 'Food',
  shelter: 'Shelter',
  emergency: 'Emergency',
  other: 'Other',
};

// Color block per category, used when a campaign has no photo.
const CATEGORY_COLORS = {
  medical: 'bg-forest text-paper',
  food: 'bg-sun text-ink',
  shelter: 'bg-clay text-paper',
  emergency: 'bg-clay-dark text-paper',
  other: 'bg-ink text-paper',
};

// The picture for a campaign: its own photo, else the linked pet's photo, else a color block.
export const campaignImageSrc = (c) => c.photos?.[0] || c.pet?.photos?.[0];

export function CampaignImage({ campaign, className = '' }) {
  const src = campaignImageSrc(campaign);
  if (src) return <img src={photoUrl(src)} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  return (
    <div className={`flex h-full w-full items-end p-4 ${CATEGORY_COLORS[campaign.category] || CATEGORY_COLORS.other} ${className}`}>
      <span className="font-display text-3xl font-extrabold leading-none">
        {CATEGORY_LABELS[campaign.category]}
      </span>
    </div>
  );
}

// One campaign in a grid.
export default function CampaignCard({ campaign }) {
  const left = daysLeft(campaign.endDate);
  return (
    <article className="overflow-hidden rounded-2xl border-2 border-line bg-paper transition-colors hover:border-ink">
      <Link to={`/campaigns/${campaign._id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-line">
          <CampaignImage campaign={campaign} />
          {campaignImageSrc(campaign) && (
            <span className="absolute left-3 top-3 rounded-full bg-paper px-2.5 py-0.5 text-xs font-bold text-ink">
              {CATEGORY_LABELS[campaign.category]}
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-xl font-extrabold leading-tight">{campaign.title}</h3>
          <div className="mt-4">
            <ProgressBar raised={campaign.raisedAmount} goal={campaign.goalAmount} />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
            <p>
              <span className="font-bold">{formatMoney(campaign.raisedAmount)}</span>
              <span className="text-muted"> of {formatMoney(campaign.goalAmount)}</span>
            </p>
            <p className="font-semibold">{percent(campaign.raisedAmount, campaign.goalAmount)}%</p>
          </div>
          <p className="mt-1 text-sm text-muted">
            {campaign.donorCount} {campaign.donorCount === 1 ? 'donor' : 'donors'} ·{' '}
            {campaign.status === 'closed' ? 'Closed' : left < 0 ? 'Ended' : left === 0 ? 'Last day' : `${left} days left`}
          </p>
        </div>
      </Link>
    </article>
  );
}
