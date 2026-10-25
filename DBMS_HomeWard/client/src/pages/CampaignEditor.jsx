import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { campaignSchema } from '../schemas/forms.js';
import { toDateInput, formatMoney } from '../utils/format.js';
import Field from '../components/Field.jsx';
import Spinner from '../components/Spinner.jsx';
import Notice from '../components/Notice.jsx';
import StatusTag from '../components/StatusTag.jsx';
import PhotoPicker, { appendPhotos } from '../components/PhotoPicker.jsx';
import { CATEGORY_LABELS } from '../components/CampaignCard.jsx';

const inDays = (n) => toDateInput(new Date(Date.now() + n * 24 * 60 * 60 * 1000));

// "Start a fundraiser" (/campaigns/new) and "Edit fundraiser" (/campaigns/:id/edit).
export default function CampaignEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [pets, setPets] = useState([]); // for the "linked pet" dropdown
  const [existing, setExisting] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(campaignSchema),
    defaultValues: { title: '', description: '', category: 'medical', goalAmount: 10000, endDate: inDays(30), pet: '' },
  });

  useEffect(() => {
    const loadPets = api('/pets?status=&limit=100').then((d) => setPets(d.pets));
    const loadCampaign = isEdit
      ? api(`/campaigns/${id}`).then(({ campaign: c }) => {
          setCampaign(c);
          setExisting(c.photos || []);
          reset({
            title: c.title,
            description: c.description,
            category: c.category,
            goalAmount: c.goalAmount,
            endDate: toDateInput(c.endDate),
            pet: c.pet?._id || '',
          });
        })
      : Promise.resolve();
    Promise.all([loadPets, loadCampaign])
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  async function onSubmit(values) {
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.append(key, String(value)));
    appendPhotos(form, existing, files, isEdit);
    try {
      const data = await api(isEdit ? `/campaigns/${id}` : '/campaigns', { method: isEdit ? 'PUT' : 'POST', body: form });
      toast.success(
        isEdit ? 'Fundraiser saved' : data.campaign.status === 'active' ? 'Fundraiser is live' : 'Sent for review'
      );
      navigate(`/campaigns/${data.campaign._id}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <Spinner />;
  if (isEdit && !campaign) {
    return <div className="container-page py-20 text-center"><h1 className="text-3xl font-extrabold">Fundraiser not found</h1></div>;
  }

  return (
    <div className="container-page max-w-5xl py-10">
      <Link to={isEdit ? `/campaigns/${id}` : '/campaigns'} className="text-sm font-semibold text-forest underline underline-offset-4">
        Back
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-extrabold">{isEdit ? 'Edit fundraiser' : 'Start a fundraiser'}</h1>
        {campaign && <StatusTag status={campaign.status} />}
      </div>

      <div className="mt-6 space-y-3">
        {!isAdmin && !isEdit && (
          <Notice title="Before you start">
            Explain clearly what the money is for, and add photos of the pet, the vet bill or the place that needs repair.
            An admin checks every fundraiser before it goes live.
          </Notice>
        )}
        {campaign?.status === 'rejected' && (
          <Notice tone="warning" title="Not approved">
            {campaign.reviewNote || 'Fix the details and save. It will be reviewed again.'}
          </Notice>
        )}
        {campaign?.raisedAmount > 0 && (
          <Notice>{formatMoney(campaign.raisedAmount)} has already been raised. Donors will see any changes you make.</Notice>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-8 md:grid-cols-[300px_1fr]" noValidate>
        <PhotoPicker existing={existing} setExisting={setExisting} files={files} setFiles={setFiles} />

        <div className="panel space-y-4 p-6">
          <Field label="Title" placeholder="Hip surgery for Daisy" error={errors.title} {...register('title')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" as="select" error={errors.category} {...register('category')}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Field>
            <Field label="Linked pet (optional)" as="select" error={errors.pet} {...register('pet')}>
              <option value="">No specific pet</option>
              {pets.map((p) => (
                <option key={p._id} value={p._id}>{p.name} ({p.species})</option>
              ))}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Goal in rupees" type="number" min="100" step="1" error={errors.goalAmount} {...register('goalAmount')} />
            <Field label="End date" type="date" error={errors.endDate} {...register('endDate')} />
          </div>
          <Field
            label="Description"
            as="textarea"
            rows={8}
            placeholder="What happened, what the money pays for, and how you will share updates"
            error={errors.description}
            {...register('description')}
          />
          <div className="flex gap-3 pt-2">
            <button className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving' : isEdit ? 'Save changes' : isAdmin ? 'Publish fundraiser' : 'Submit for review'}
            </button>
            <Link to="/campaigns" className="btn-ghost">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
