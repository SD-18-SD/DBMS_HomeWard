import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { profileSchema } from '../schemas/forms.js';
import Field from '../components/Field.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone || '', city: user.city || '' },
  });

  async function onSubmit(values) {
    try {
      const data = await api('/auth/me', { method: 'PUT', body: values });
      setUser(data.user);
      reset(values);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-4xl font-extrabold">Your profile</h1>
      <p className="mt-2 text-muted">
        Signed in as <span className="font-semibold text-ink">{user.email}</span>
        {user.role === 'admin' && ' (admin)'}. Member since{' '}
        {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="panel mt-8 space-y-4 p-6" noValidate>
        <Field label="Full name" error={errors.name} {...register('name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" error={errors.phone} {...register('phone')} />
          <Field label="City" error={errors.city} {...register('city')} />
        </div>
        <p className="text-xs text-muted">Your phone fills in automatically when you apply for a pet.</p>
        <button className="btn-primary" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
