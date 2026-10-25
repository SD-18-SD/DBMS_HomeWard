import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { registerSchema } from '../schemas/forms.js';
import AuthCard from '../components/AuthCard.jsx';
import Field from '../components/Field.jsx';

export default function Register() {
  const { user, register: signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit({ confirm, ...values }) {
    try {
      await signUp(values);
      toast.success('Account created');
      navigate('/pets');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Free, and it takes under a minute. You need one to apply for a pet."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-forest underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Full name" autoComplete="name" error={errors.name} {...register('name')} />
        <Field label="Email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password}
          {...register('password')}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm}
          {...register('confirm')}
        />
        <p className="text-xs text-muted">At least 8 characters with one letter and one number.</p>
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  );
}
