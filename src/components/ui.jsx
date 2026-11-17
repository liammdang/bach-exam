import { emph } from '../lib/format';

export function Button({ variant = 'primary', className = '', ...p }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-bblue/40';
  const v = {
    primary: 'bg-forest text-white hover:bg-forest-700',
    blue: 'bg-bblue text-white hover:bg-bblue-700',
    ghost: 'bg-white text-forest border border-line hover:border-forest-300',
    danger: 'bg-white text-alert border border-alert/40 hover:bg-alert-soft',
    lime: 'bg-lime text-forest hover:bg-lime-dark',
  }[variant];
  return <button className={`${base} ${v} ${className}`} {...p} />;
}

export function Card({ className = '', ...p }) {
  return <div className={`rounded-xl border border-line bg-white ${className}`} {...p} />;
}

export function Banner({ tone = 'info', children, className = '' }) {
  const t = {
    info: 'bg-bblue-50 text-bblue-700 border-bblue-200',
    warn: 'bg-alert-soft text-alert border-alert/30',
    ok: 'bg-lime-soft text-forest border-lime-dark/50',
  }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${t} ${className}`}>{children}</div>;
}

export function Spinner({ label = 'Đang tải…' }) {
  return (
    <div className="flex items-center gap-3 text-forest-500 text-sm">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-forest-300 border-t-transparent" />
      {label}
    </div>
  );
}

export function Modal({ open, title, children, actions, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="font-display text-2xl font-extrabold tracking-tight text-forest">{title}</h3>
        <div className="mt-3 text-[15px] leading-relaxed text-forest">{children}</div>
        <div className="mt-6 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function Emph({ text }) {
  return emph(text).map((p, i) => (p.b ? <b key={i} className="font-semibold">{p.b}</b> : <span key={i}>{p.t}</span>));
}
