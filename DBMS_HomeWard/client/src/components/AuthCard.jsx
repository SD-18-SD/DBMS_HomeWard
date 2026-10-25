// Shared frame for the login and register pages.
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="container-page flex justify-center py-14">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-extrabold">{title}</h1>
        <p className="mt-2 text-muted">{subtitle}</p>
        <div className="panel mt-8 p-6">{children}</div>
        {footer && <p className="mt-6 text-center text-sm">{footer}</p>}
      </div>
    </div>
  );
}
