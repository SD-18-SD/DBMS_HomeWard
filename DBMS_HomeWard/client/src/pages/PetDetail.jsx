import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { applicationSchema } from '../schemas/forms.js';
import PetPhoto from '../components/PetPhoto.jsx';
import StatusTag from '../components/StatusTag.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import Spinner from '../components/Spinner.jsx';
import { ageLabel } from '../components/PetCard.jsx';

export default function PetDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [pet, setPet] = useState(null);
  const [myApplication, setMyApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState(0); // which photo is shown large

  useEffect(() => {
    setLoading(true);
    setPhoto(0);
    api(`/pets/${id}`)
      .then((data) => setPet(data.pet))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // If logged in, check whether this user already applied for this pet.
  useEffect(() => {
    if (!user) return;
    api('/applications/mine')
      .then((data) => setMyApplication(data.applications.find((a) => a.pet?._id === id) || null))
      .catch(() => {});
  }, [user, id]);

  if (loading) return <Spinner />;
  if (!pet) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-3xl font-extrabold">This pet could not be found</h1>
        <Link to="/pets" className="btn-primary mt-6">Back to all pets</Link>
      </div>
    );
  }

  const facts = [
    ['Species', pet.species],
    ['Breed', pet.breed],
    ['Age', ageLabel(pet.age)],
    ['Gender', pet.gender],
    ['Size', pet.size],
    ['Vaccinated', pet.vaccinated ? 'Yes' : 'Not yet'],
  ];
  if (pet.location) facts.push(['Location', pet.location]);

  const isOwner = user && pet.createdBy?._id === user._id;
  const byShelter = !pet.createdBy || pet.createdBy.role === 'admin';

  return (
    <div className="container-page py-10">
      <Link to="/pets" className="text-sm font-semibold text-forest underline underline-offset-4">
        Back to all pets
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl border-2 border-ink">
            <PetPhoto pet={pet} index={photo} />
          </div>
          {pet.photos?.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pet.photos.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPhoto(i)}
                  aria-label={`Show photo ${i + 1}`}
                  className={`h-20 w-20 overflow-hidden rounded-xl border-2 ${i === photo ? 'border-ink' : 'border-line hover:border-muted'}`}
                >
                  <PetPhoto pet={pet} index={i} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusTag status={pet.status} />
            {pet.reviewStatus !== 'approved' && <StatusTag status={pet.reviewStatus} />}
            {(isAdmin || isOwner) && (
              <Link to={`/listings/${pet._id}/edit`} className="text-sm font-semibold underline underline-offset-4">
                Edit this listing
              </Link>
            )}
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="text-5xl font-extrabold sm:text-6xl">{pet.name}</h1>
            <FavoriteButton
              withText
              active={favoriteIds.has(pet._id)}
              onClick={() => toggleFavorite(pet._id)}
            />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border-2 border-line bg-line sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="bg-paper p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-muted">{k}</dt>
                <dd className="mt-1 font-semibold capitalize">{v}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 text-sm text-muted">
            Listed by {byShelter ? 'Homeward Shelter' : pet.createdBy.name}
          </p>

          {pet.description && <p className="mt-6 whitespace-pre-line text-lg leading-relaxed">{pet.description}</p>}

          {pet.contact && (pet.contact.name || pet.contact.phone || pet.contact.email) && (
            <div className="panel mt-6 p-5">
              <h2 className="text-lg font-extrabold">Contact</h2>
              <p className="mt-1">{pet.contact.name}</p>
              {pet.contact.phone && (
                <a href={`tel:${pet.contact.phone}`} className="block font-semibold text-forest underline underline-offset-4">
                  {pet.contact.phone}
                </a>
              )}
              {pet.contact.email && (
                <a href={`mailto:${pet.contact.email}`} className="block font-semibold text-forest underline underline-offset-4">
                  {pet.contact.email}
                </a>
              )}
            </div>
          )}
          {!user && (pet.location || !byShelter) && (
            <p className="mt-6 text-sm text-muted">
              <Link to="/login" state={{ from: `/pets/${pet._id}` }} className="font-semibold text-forest underline">Log in</Link>{' '}
              to see contact details.
            </p>
          )}

          <div className="mt-8">
            <ApplySection pet={pet} user={user} isAdmin={isAdmin} isOwner={isOwner} existing={myApplication} onApplied={setMyApplication} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Decides what to show under the pet: a login prompt, the form, or the current status.
function ApplySection({ pet, user, isAdmin, isOwner, existing, onApplied }) {
  if (isOwner) {
    return (
      <div className="panel p-5">
        <p className="font-semibold">This is your listing.</p>
        <Link to="/dashboard?tab=listings" className="mt-2 inline-block text-sm font-semibold text-forest underline underline-offset-4">
          See applications in your dashboard
        </Link>
      </div>
    );
  }
  if (pet.reviewStatus !== 'approved') {
    return <div className="panel p-5 text-muted">This listing is not public yet.</div>;
  }
  if (existing) {
    return (
      <div className="panel p-5">
        <p className="font-semibold">
          You applied for {pet.name}. Current status: <StatusTag status={existing.status} />
        </p>
        <Link to="/dashboard" className="mt-3 inline-block text-sm font-semibold text-forest underline underline-offset-4">
          Track it in your dashboard
        </Link>
      </div>
    );
  }
  if (pet.status !== 'available') {
    return (
      <div className="panel p-5 text-muted">
        {pet.name} is {pet.status} and is not taking new applications.
      </div>
    );
  }
  if (!user) {
    return (
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="font-semibold">Log in to apply for {pet.name}.</p>
        <Link to="/login" state={{ from: `/pets/${pet._id}` }} className="btn-primary">Log in</Link>
      </div>
    );
  }
  if (isAdmin) {
    return <div className="panel p-5 text-muted">Admins manage applications from the admin dashboard.</div>;
  }
  return <ApplicationForm pet={pet} onApplied={onApplied} defaultPhone={user.phone} />;
}

function ApplicationForm({ pet, onApplied, defaultPhone }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(applicationSchema),
    defaultValues: { phone: defaultPhone || '', homeType: 'apartment', hasOtherPets: false, message: '' },
  });

  async function onSubmit(values) {
    try {
      const data = await api('/applications', { method: 'POST', body: { ...values, pet: pet._id } });
      toast.success('Application sent');
      onApplied(data.application);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="panel space-y-4 p-5" noValidate>
      <h2 className="text-2xl font-extrabold">Apply to adopt {pet.name}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="label">Phone</label>
          <input id="phone" className="input" {...register('phone')} />
          {errors.phone && <p className="error-text">{errors.phone.message}</p>}
        </div>
        <div>
          <label htmlFor="homeType" className="label">Home type</label>
          <select id="homeType" className="input" {...register('homeType')}>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="farm">Farm</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5 accent-forest" {...register('hasOtherPets')} />
        I already have other pets at home
      </label>

      <div>
        <label htmlFor="message" className="label">Why would {pet.name} fit your home?</label>
        <textarea id="message" rows={4} className="input" {...register('message')} />
        {errors.message && <p className="error-text">{errors.message.message}</p>}
      </div>

      <button className="btn-accent w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? 'Sending' : 'Send application'}
      </button>
    </form>
  );
}
