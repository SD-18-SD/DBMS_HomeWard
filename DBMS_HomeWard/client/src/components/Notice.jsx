// A message box. tone: "info" (yellow) or "warning" (clay).
export default function Notice({ tone = 'info', title, children }) {
  const tones = {
    info: 'border-sun bg-sun/25',
    warning: 'border-clay bg-clay/10',
  };
  return (
    <div className={`rounded-xl border-2 p-4 text-sm ${tones[tone]}`} role="status">
      {title && <p className="font-bold">{title}</p>}
      <div className={title ? 'mt-1' : ''}>{children}</div>
    </div>
  );
}
