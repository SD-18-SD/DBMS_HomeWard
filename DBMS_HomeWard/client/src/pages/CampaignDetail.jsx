import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { api, photoUrl } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { donationSchema } from '../schemas/forms.js';
import { daysLeft, formatDate, formatMoney, percent } from '../utils/format.js';
import { CampaignImage, CATEGORY_LABELS } from '../components/CampaignCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import StatusTag from '../components/StatusTag.jsx';
import Spinner from '../components/Spinner.jsx';
import Notice from '../components/Notice.jsx';
import PetPhoto from '../components/PetPhoto.jsx';

const PRESETS = [100, 500, 1000, 2500];

export default function CampaignDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [photo, setPhoto] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/campaigns/${id}`)
      .then((data) => {
        setCampaign(data.campaign);
        setDonations(data.donations);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (!campaign) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-3xl font-extrabold">This fundraiser could not be found</h1>
        <Link to="/campaigns" className="btn-primary mt-6">See all fundraisers</Link>
      </div>
    );
  }

  const left = daysLeft(campaign.endDate);
  const isOwner = user && campaign.createdBy?._id === user._id;
  const canEdit = (isOwner || isAdmin) && campaign.status !== 'closed';
  const open = campaign.status === 'active' && left >= 0;

  function onDonated(donation, updated) {
    setDonations((list) => [donation, ...list]);
    setCampaign((c) => ({ ...c, raisedAmount: updated.raisedAmount, donorCount: updated.donorCount }));
  }

  return (
    <div className="container-page py-10">
      <Link to="/campaigns" className="text-sm font-semibold text-forest underline underline-offset-4">
        All fundraisers
      </Link>

      {campaign.status === 'pending_review' && (
        <div className="mt-4"><Notice title="Waiting for review">Only you and admins can see this page until it is approved.</Notice></div>
      )}
      {campaign.status === 'rejected' && (
        <div className="mt-4">
          <Notice tone="warning" title="Not approved">{campaign.reviewNote || 'Edit the campaign and it will be reviewed again.'}</Notice>
        </div>
      )}
      {campaign.status === 'paused' && (
        <div className="mt-4"><Notice title="Paused">This fundraiser is paused and is not taking donations right now.</Notice></div>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: photos and story */}
        <div>
          <div className="aspect-[16/10] overflow-hidden rounded-3xl border-2 border-ink">
            {campaign.photos?.length ? (
              <img src={photoUrl(campaign.photos[photo])} alt="" className="h-full w-full object-cover" />
            ) : (
              <CampaignImage campaign={campaign} />
            )}
          </div>
          {campaign.photos?.length > 1 && (
            <div className="mt-3 flex gap-2">
              {campaign.photos.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPhoto(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === photo ? 'border-ink' : 'border-line'}`}
                  aria-label={`Show photo ${i + 1}`}
                >
                  <img src={photoUrl(p)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold">{CATEGORY_LABELS[campaign.category]}</span>
            {campaign.status !== 'active' && <StatusTag status={campaign.status} />}
            {canEdit && (
              <Link to={`/campaigns/${campaign._id}/edit`} className="text-sm font-semibold underline underline-offset-4">
                Edit fundraiser
              </Link>
            )}
          </div>
          <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{campaign.title}</h1>
          <p className="mt-2 text-sm text-muted">
            Started by {campaign.createdBy?.role === 'admin' ? 'Homeward Shelter' : campaign.createdBy?.name || 'a former member'} on{' '}
            {formatDate(campaign.createdAt)}
          </p>
          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed">{campaign.description}</p>

          {campaign.pet && (
            <Link to={`/pets/${campaign.pet._id}`} className="panel mt-8 flex items-center gap-4 p-4 hover:border-ink">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-line">
                <PetPhoto pet={campaign.pet} className="[&>span]:text-2xl" />
              </div>
              <div>
                <p className="text-sm text-muted">This fundraiser is for</p>
                <p className="text-xl font-extrabold">{campaign.pet.name}</p>
              </div>
            </Link>
          )}
        </div>

        {/* Right: progress, donate, donors */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-6">
            <p className="font-display text-4xl font-extrabold">{formatMoney(campaign.raisedAmount)}</p>
            <p className="mt-1 text-muted">raised of {formatMoney(campaign.goalAmount)} goal</p>
            <div className="mt-4">
              <ProgressBar raised={campaign.raisedAmount} goal={campaign.goalAmount} size="lg" />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat label="funded" value={`${percent(campaign.raisedAmount, campaign.goalAmount)}%`} />
              <Stat label={campaign.donorCount === 1 ? 'donor' : 'donors'} value={campaign.donorCount} />
              <Stat
                label={left < 0 || campaign.status === 'closed' ? 'ended' : 'days left'}
                value={left < 0 || campaign.status === 'closed' ? formatDate(campaign.endDate).slice(0, 6) : left}
              />
            </dl>
          </div>

          {open ? (
            <DonateForm campaignId={campaign._id} user={user} onDonated={onDonated} />
          ) : (
            <div className="panel p-5 text-muted">
              {campaign.status === 'closed' || left < 0
                ? 'This fundraiser has ended. Thank you to everyone who gave.'
                : 'Donations are not open for this fundraiser.'}
            </div>
          )}

          <div className="panel p-5">
            <h2 className="text-xl font-extrabold">Recent donations</h2>
            {donations.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No donations yet. Be the first.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {donations.map((d) => (
                  <li key={d._id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{d.donorName}</span>
                      <span className="font-bold">{formatMoney(d.amount)}</span>
                    </div>
                    {d.message && <p className="mt-1 text-sm text-muted">{d.message}</p>}
                    <p className="mt-1 text-xs text-muted">{formatDate(d.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-cream p-2">
      <dd className="font-display text-xl font-extrabold">{value}</dd>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
    </div>
  );
}

function DonateForm({ campaignId, user, onDonated }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(donationSchema),
    defaultValues: { amount: 500, isAnonymous: false, donorName: '', message: '' },
  });
  const amount = Number(watch('amount'));

  async function onSubmit(values) {
    try {
      const data = await api(`/campaigns/${campaignId}/donations`, { method: 'POST', body: values });
      toast.success(`Thank you for donating ${formatMoney(values.amount)}`);
      onDonated(data.donation, data.campaign);
      reset({ ...values, message: '' });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="panel space-y-4 p-6" noValidate>
      <h2 className="text-2xl font-extrabold">Donate</h2>

      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setValue('amount', p, { shouldValidate: true })}
            className={`rounded-lg border-2 py-2 text-sm font-bold transition-colors ${
              amount === p ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
            }`}
          >
            {formatMoney(p)}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="amount" className="label">Amount in rupees</label>
        <input id="amount" type="number" min="10" step="1" className="input" {...register('amount')} />
        {errors.amount && <p className="error-text">{errors.amount.message}</p>}
      </div>

      {!user && (
        <div>
          <label htmlFor="donorName" className="label">Your name (optional)</label>
          <input id="donorName" className="input" placeholder="Leave blank to stay anonymous" {...register('donorName')} />
        </div>
      )}

      <div>
        <label htmlFor="message" className="label">Message (optional)</label>
        <textarea id="message" rows={2} className="input" {...register('message')} />
        {errors.message && <p className="error-text">{errors.message.message}</p>}
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5 accent-forest" {...register('isAnonymous')} />
        Hide my name on this page
      </label>

      <button className="btn-accent w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending' : `Donate ${amount >= 10 ? formatMoney(amount) : ''}`}
      </button>

      <p className="text-xs text-muted">
        Demo project: no real payment is taken. The donation is recorded so you can see how the campaign progresses.
        {!user && (
          <>
            {' '}
            <Link to="/login" className="font-semibold underline">Log in</Link> to keep a donation history.
          </>
        )}
      </p>
    </form>
  );
}
