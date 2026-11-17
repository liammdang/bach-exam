import { Emph } from './ui';
import { wordCount } from '../lib/format';

function Img({ src, alt, className = '' }) {
  if (!src) {
    return <div className={`flex aspect-[4/3] items-center justify-center rounded bg-paper text-xs text-forest-300 ${className}`}>Đang tải ảnh…</div>;
  }
  return <img src={src} alt={alt || ''} className={`select-none ${className}`} draggable={false} />;
}

function Num({ n, muted }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-display text-base font-bold ${muted ? 'bg-[#E6EADD] text-forest-300' : 'bg-forest text-white'}`}>
      {n}
    </span>
  );
}

function Letter({ k, active }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-semibold ${active ? 'border-bblue bg-bblue text-white' : 'border-forest-300 text-forest'}`}>
      {k}
    </span>
  );
}

const optBase = 'group relative rounded-lg border bg-white text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-bblue/40';
const optState = (active) => (active ? 'border-bblue ring-1 ring-bblue bg-[#F3F7FD]' : 'border-line hover:border-forest-300');

function McOptions({ block, value, onPick, images, disabled }) {
  const { options, layout } = block.data;
  if (layout === 'list') {
    return (
      <div className="flex flex-col gap-2 md:w-80">
        {options.map((o) => (
          <button key={o.key} type="button" disabled={disabled} onClick={() => onPick(o.key)}
            className={`${optBase} ${optState(value === o.key)} flex items-center gap-3 px-3.5 py-2.5 disabled:cursor-default`}>
            <Letter k={o.key} active={value === o.key} />
            <span className="text-[15px]">{o.text}</span>
          </button>
        ))}
      </div>
    );
  }
  const grid = layout === 'images' ? 'grid-cols-3' : layout === 'web' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1';
  return (
    <div className={`grid gap-3 ${grid}`}>
      {options.map((o) => (
        <button key={o.key} type="button" disabled={disabled} onClick={() => onPick(o.key)}
          className={`${optBase} ${optState(value === o.key)} p-2.5 disabled:cursor-default ${layout === 'stack' ? 'flex items-start gap-3' : ''}`}>
          {layout === 'stack' && <Letter k={o.key} active={value === o.key} />}
          <Img src={images[o.image]} alt={o.text || `Option ${o.key}`} className={`w-full rounded ${layout === 'images' ? 'mx-auto max-w-[190px]' : ''}`} />
          {layout !== 'stack' && (
            <div className="mt-2.5 flex items-start gap-2.5 px-1 pb-0.5">
              <Letter k={o.key} active={value === o.key} />
              <span className="text-[14.5px] leading-snug">{o.text}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function RfButtons({ value, onPick, disabled }) {
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-line">
      {[['R', 'Richtig'], ['F', 'Falsch']].map(([k, t], i) => (
        <button key={k} type="button" disabled={disabled} onClick={() => onPick(k)}
          className={`px-4 py-2 text-sm font-semibold transition disabled:cursor-default ${i ? 'border-l border-line' : ''} ${value === k ? 'bg-bblue text-white' : 'bg-white text-forest hover:bg-paper'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function TeilHeader({ block }) {
  return (
    <div className="pt-4">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-bblue">{block.data.title}</h2>
      <div className="mt-2 space-y-0.5 text-[15px] leading-relaxed text-forest">
        {block.data.lines.map((l, i) => <p key={i}>{l}</p>)}
      </div>
    </div>
  );
}

function Beispiel({ block, images }) {
  const d = block.data;
  return (
    <div className="rounded-xl border border-dashed border-[#C3CCB5] bg-[#F5F7EF] p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-forest-500">Beispiel · không tính điểm</div>
      {d.place && <p className="mb-2 text-sm"><Emph text={d.place} /></p>}
      {d.type === 'rf' && d.image && <Img src={images[d.image]} className="mb-4 max-w-sm rounded" />}
      <div className="flex flex-wrap items-start gap-4">
        <Num n={0} muted />
        <div className="min-w-0 flex-1">
          <p className="text-[15px]">{d.prompt}</p>
          {d.type === 'mc' && <div className="mt-3 opacity-80"><McOptions block={block} value={d.marked} onPick={() => {}} images={images} disabled /></div>}
        </div>
        {d.type === 'rf' && <RfButtons value={d.marked} onPick={() => {}} disabled />}
      </div>
    </div>
  );
}

export function Block({ block, value, onChange, images, locked }) {
  const d = block.data;
  const anchor = block.scored ? { id: `q-${block.id}` } : {};
  switch (block.kind) {
    case 'teil':
      return <TeilHeader block={block} />;
    case 'beispiel':
      return <Beispiel block={block} images={images} />;
    case 'stimulus':
      return (
        <div className="flex justify-center rounded-xl border border-line bg-white p-4">
          <Img src={images[d.image]} alt={d.alt} className="w-full max-w-2xl" />
        </div>
      );
    case 'mc':
      return (
        <section {...anchor} className="scroll-mt-28 rounded-xl border border-line bg-white p-5">
          <div className="flex items-start gap-4">
            <Num n={d.num} />
            <p className="pt-1 text-[15.5px] font-medium">{d.prompt}</p>
          </div>
          <div className="mt-4 md:pl-12"><McOptions block={block} value={value} onPick={(v) => onChange(block.id, v)} images={images} disabled={locked} /></div>
        </section>
      );
    case 'rf':
      return (
        <section {...anchor} className="scroll-mt-28 rounded-xl border border-line bg-white p-5">
          {d.place && <p className="mb-3 text-sm md:pl-12"><Emph text={d.place} /></p>}
          {d.image && <div className="mb-4 md:pl-12"><Img src={images[d.image]} className="w-full max-w-sm rounded" /></div>}
          <div className="flex flex-wrap items-center gap-4">
            <Num n={d.num} />
            <p className="min-w-0 flex-1 text-[15.5px]">{d.prompt}</p>
            <RfButtons value={value} onPick={(v) => onChange(block.id, v)} disabled={locked} />
          </div>
        </section>
      );
    case 'field':
      return (
        <section {...anchor} className="scroll-mt-28 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white px-5 py-4">
          <Num n={d.num} />
          <label htmlFor={`in-${block.id}`} className="w-44 text-[15px]">{d.label}</label>
          <div className="flex flex-1 items-center gap-2">
            {d.prefix && <span className="rounded border border-line bg-paper px-2.5 py-2 text-sm text-forest-500">{d.prefix}</span>}
            <input id={`in-${block.id}`} disabled={locked} value={value || ''} maxLength={120} autoComplete="off" spellCheck={false}
              onChange={(e) => onChange(block.id, e.target.value, true)}
              className="w-full max-w-sm rounded-lg border border-line px-3 py-2 outline-none focus:border-bblue focus:ring-2 focus:ring-bblue/15 disabled:bg-paper" />
          </div>
        </section>
      );
    case 'choice':
      return (
        <section {...anchor} className="scroll-mt-28 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white px-5 py-4">
          <Num n={d.num} />
          <span className="w-44 text-[15px]">{d.label}</span>
          <div className="flex gap-3">
            {d.options.map((o) => (
              <label key={o.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm ${value === o.key ? 'border-bblue bg-bblue-50' : 'border-line'} ${locked ? 'cursor-default' : ''}`}>
                <input type="radio" name={block.id} className="accent-bblue" disabled={locked} checked={value === o.key} onChange={() => onChange(block.id, o.key)} />
                {o.text}
              </label>
            ))}
          </div>
        </section>
      );
    case 'essay': {
      const wc = wordCount(value);
      return (
        <section {...anchor} className="scroll-mt-28 rounded-xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <label htmlFor={`in-${block.id}`} className="text-[15px] font-medium">{d.label}</label>
            <span className={`text-sm ${wc >= 25 ? 'text-forest' : 'text-forest-500'}`}>{wc} Wörter</span>
          </div>
          <textarea id={`in-${block.id}`} disabled={locked} value={value || ''} maxLength={2500} spellCheck={false} rows={12}
            onChange={(e) => onChange(block.id, e.target.value, true)}
            className="mt-3 w-full resize-y rounded-lg border border-line px-4 py-3 text-[15.5px] leading-7 outline-none focus:border-bblue focus:ring-2 focus:ring-bblue/15 disabled:bg-paper"
            placeholder="Schreiben Sie hier …" />
        </section>
      );
    }
    default:
      return null;
  }
}
