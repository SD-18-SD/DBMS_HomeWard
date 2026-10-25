import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { petSchemaFor } from '../schemas/forms.js';
import Field from '../components/Field.jsx';
import Spinner from '../components/Spinner.jsx';
import Notice from '../components/Notice.jsx';
import StatusTag from '../components/StatusTag.jsx';
import PhotoPicker, { appendPhotos } from '../components/PhotoPicker.jsx';

const EMPTY = {
  name: '',
  species: 'dog',
  breed: 'Mixed',
  age: 1,
  gender: 'male',
  size: 'medium',
  status: 'available',
  vaccinated: false,
  description: '',
  location: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
};

// "List a pet" (/listings/new) and "Edit listing" (/listings/:id/edit).
// Used by regular users AND admins. User listings are reviewed before going live.
export default function PetEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [pet, setPet] = useState(null);
  const [existing, setExisting] = useState([]); // photo paths already saved
  const [files, setFiles] = useState([]); // new photos picked now
  const [loading, setLoading] = useState(isEdit);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(petSchemaFor(isAdmin)),
    // New user listings start with the user's own contact details.
    defaultValues: isAdmin
      ? EMPTY
      : { ...EMPTY, location: user.city || '', contactName: user.name, contactPhone: user.phone || '', contactEmail: user.email },
  });

  // When editing, load the pet and fill the form.
  useEffect(() => {
    if (!isEdit) return;
    api(`/pets/${id}`)
      .then(({ pet }) => {
        setPet(pet);
        setExisting(pet.photos || []);
        reset({
          ...EMPTY,
          ...pet,
          contactName: pet.contact?.name || '',
          contactPhone: pet.contact?.phone || '',
          contactEmail: pet.contact?.email || '',
        });
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  async function onSubmit(values) {
    // FormData is needed to send files together with text fields.
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.append(key, String(value)));
    appendPhotos(form, existing, files, isEdit);

    try {
      await api(isEdit ? `/pets/${id}` : '/pets', { method: isEdit ? 'PUT' : 'POST', body: form });
      if (isAdmin) toast.success(isEdit ? 'Pet updated' : 'Pet added');
      else toast.success('Sent for review. We will let you know in your dashboard.');
      navigate(isAdmin ? '/admin' : '/dashboard?tab=listings');
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <Spinner />;
  if (isEdit && !pet) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-3xl font-extrabold">Listing not found</h1>
      </div>
    );
  }

  const backTo = isAdmin ? '/admin' : '/dashboard?tab=listings';

  return (
    <div className="container-page max-w-5xl py-10">
      <Link to={backTo} className="text-sm font-semibold text-forest underline underline-offset-4">
        Back
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-extrabold">{isEdit ? `Edit ${pet.name}` : 'List a pet for adoption'}</h1>
        {pet && <StatusTag status={pet.reviewStatus} />}
      </div>

      <div className="mt-6 space-y-3">
        {!isAdmin && !isEdit && (
          <Notice title="How listing works">
            Fill in the details and add a few clear photos. Our team checks every listing, usually within a day.
            Once approved it appears in search and people can apply. You review the applications yourself from your
            dashboard.
          </Notice>
        )}
        {pet?.reviewNote && ['changes_requested', 'rejected'].includes(pet.reviewStatus) && (
          <Notice tone="warning" title={pet.reviewStatus === 'rejected' ? 'This listing was rejected' : 'Changes requested'}>
            {pet.reviewNote}
          </Notice>
        )}
        {!isAdmin && pet?.reviewStatus === 'approved' && (
          <Notice>Saving changes sends this listing back for review. It will be hidden from search until approved again.</Notice>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-8 md:grid-cols-[300px_1fr]" noValidate>
        <div>
          <PhotoPicker existing={existing} setExisting={setExisting} files={files} setFiles={setFiles} />
        </div>

        <div className="space-y-6">
          <section className="panel space-y-4 p-6">
            <h2 className="text-xl font-extrabold">About the pet</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" error={errors.name} {...register('name')} />
              <Field label="Breed" error={errors.breed} {...register('breed')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Species" as="select" error={errors.species} {...register('species')}>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="rabbit">Rabbit</option>
                <option value="bird">Bird</option>
                <option value="other">Other</option>
              </Field>
              <Field label="Age (years)" type="number" min="0" max="30" error={errors.age} {...register('age')} />
              <Field label="Gender" as="select" error={errors.gender} {...register('gender')}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Size" as="select" error={errors.size} {...register('size')}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </Field>
              <Field label="Availability" as="select" error={errors.status} {...register('status')}>
                <option value="available">Available</option>
                <option value="pending">Pending</option>
                <option value="adopted">Adopted</option>
              </Field>
            </div>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-forest" {...register('vaccinated')} />
              Vaccinated
            </label>

            <Field
              label="Description"
              as="textarea"
              rows={5}
              placeholder="Personality, health, habits, and why they need a new home"
              error={errors.description}
              {...register('description')}
            />
          </section>

          <section className="panel space-y-4 p-6">
            <h2 className="text-xl font-extrabold">Location and contact</h2>
            {isAdmin && <p className="text-sm text-muted">Optional for shelter pets. Leave blank to use the shelter details.</p>}
            <Field label="Location (city or area)" error={errors.location} {...register('location')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact name" error={errors.contactName} {...register('contactName')} />
              <Field label="Contact phone" error={errors.contactPhone} {...register('contactPhone')} />
            </div>
            <Field label="Contact email (optional)" type="email" error={errors.contactEmail} {...register('contactEmail')} />
            <p className="text-xs text-muted">Contact details are only shown to people who are logged in.</p>
          </section>

          <div className="flex gap-3">
            <button className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving' : isEdit ? 'Save changes' : isAdmin ? 'Add pet' : 'Submit for review'}
            </button>
            <Link to={backTo} className="btn-ghost">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
