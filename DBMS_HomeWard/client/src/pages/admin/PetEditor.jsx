import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { api, photoUrl } from '../../api/client.js';
import { petSchema } from '../../schemas/forms.js';
import Field from '../../components/Field.jsx';
import Spinner from '../../components/Spinner.jsx';

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
};

const MAX_BYTES = 2 * 1024 * 1024;

// One page for both "Add a pet" (/admin/pets/new) and "Edit" (/admin/pets/:id/edit).
export default function PetEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(isEdit);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(petSchema), defaultValues: EMPTY });

  // When editing, load the pet and fill the form.
  useEffect(() => {
    if (!isEdit) return;
    api(`/pets/${id}`)
      .then(({ pet }) => {
        reset({ ...EMPTY, ...pet });
        setPreview(pet.photo ? photoUrl(pet.photo) : '');
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  // Free the temporary preview URL when it changes.
  useEffect(() => () => preview.startsWith('blob:') && URL.revokeObjectURL(preview), [preview]);

  function pickFile(e) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(chosen.type)) {
      toast.error('Use a JPG, PNG or WEBP image');
      return;
    }
    if (chosen.size > MAX_BYTES) {
      toast.error('Image must be 2 MB or smaller');
      return;
    }
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  async function onSubmit(values) {
    // FormData is needed to send a file together with text fields.
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.append(key, String(value)));
    if (file) form.append('photo', file);

    try {
      await api(isEdit ? `/pets/${id}` : '/pets', { method: isEdit ? 'PUT' : 'POST', body: form });
      toast.success(isEdit ? 'Pet updated' : 'Pet added');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="container-page max-w-4xl py-10">
      <Link to="/admin" className="text-sm font-semibold text-forest underline underline-offset-4">
        Back to admin
      </Link>
      <h1 className="mt-4 text-4xl font-extrabold">{isEdit ? 'Edit pet' : 'Add a pet'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-8 md:grid-cols-[280px_1fr]" noValidate>
        {/* Photo picker */}
        <div>
          <span className="label">Photo</span>
          <label className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-ink bg-paper text-center text-sm font-semibold text-muted hover:bg-sage">
            {preview ? (
              <img src={preview} alt="Pet preview" className="h-full w-full object-cover" />
            ) : (
              <span className="px-6">Click to choose an image<br />JPG, PNG or WEBP, up to 2 MB</span>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickFile} />
          </label>
          {preview && <p className="mt-2 text-xs text-muted">Click the photo to replace it.</p>}
        </div>

        {/* Details */}
        <div className="panel space-y-4 p-6">
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

          <Field label="Description" as="textarea" rows={5} error={errors.description} {...register('description')} />

          <div className="flex gap-3 pt-2">
            <button className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving' : isEdit ? 'Save changes' : 'Add pet'}
            </button>
            <Link to="/admin" className="btn-ghost">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
