import toast from 'react-hot-toast';
import { api } from '../../api/client.js';

// Shared admin actions, so the review queue and the tables behave the same way.

// Approve, reject or request changes on a pet listing.
export async function reviewListing(pet, reviewStatus, reload) {
  let reviewNote = '';
  if (reviewStatus !== 'approved') {
    reviewNote = prompt(
      reviewStatus === 'rejected'
        ? `Why is ${pet.name} being rejected? The owner will see this.`
        : `What should the owner change for ${pet.name}?`,
      ''
    );
    if (reviewNote === null) return; // Cancel
  }
  try {
    await api(`/pets/${pet._id}/review`, { method: 'PATCH', body: { reviewStatus, reviewNote } });
    toast.success(
      reviewStatus === 'approved' ? `${pet.name} is now live` : reviewStatus === 'rejected' ? 'Listing rejected' : 'Changes requested'
    );
    await reload();
  } catch (err) {
    toast.error(err.message);
  }
}

const STATUS_MESSAGES = {
  active: 'Fundraiser is live',
  paused: 'Fundraiser paused',
  closed: 'Fundraiser closed',
  rejected: 'Fundraiser rejected',
};

// Approve (active), pause, resume (active), close or reject a campaign.
export async function setCampaignStatus(campaign, status, reload) {
  let reviewNote = '';
  if (status === 'rejected') {
    reviewNote = prompt('Why is this fundraiser being rejected? The owner will see this.', '');
    if (reviewNote === null) return;
  }
  if (status === 'closed' && !confirm(`Close "${campaign.title}"? It will stop taking donations.`)) return;
  try {
    await api(`/campaigns/${campaign._id}/status`, { method: 'PATCH', body: { status, reviewNote } });
    toast.success(STATUS_MESSAGES[status]);
    await reload();
  } catch (err) {
    toast.error(err.message);
  }
}
