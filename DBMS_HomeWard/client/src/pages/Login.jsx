import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { loginSchema } from '../schemas/forms.js';
import AuthCard from '../components/AuthCard.jsx';
import Field from '../components/Field.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;

  async function onSubmit(values) {
    try {
      const loggedIn = await login(values);
      toast.success(`Welcome back, ${loggedIn.name.split(' ')[0]}`);
      navigate(from || (loggedIn.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Pick up where you left off with your saved pets and applications."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-forest underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
          {...register('password')}
        />
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in' : 'Log in'}
        </button>
      </form>
    </AuthCard>
  );
}
