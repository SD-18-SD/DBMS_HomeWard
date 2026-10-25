import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-8xl font-extrabold text-clay">404</p>
      <h1 className="mt-4 text-3xl font-extrabold">This page wandered off</h1>
      <p className="mt-2 text-muted">The link may be old, or the page was moved.</p>
      <Link to="/" className="btn-primary mt-8">Go home</Link>
    </div>
  );
}
