import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminDb } from '../lib/supabase';
import { rpc } from '../lib/rpc';
import { friendly } from '../lib/errors';
import { fmtPts, timeOf, wordCount } from '../lib/format';
import { Banner, Button, Card, Spinner } from '../components/ui';

const T2_CRITERIA = [
  { k: 'lp1', label: 'Ý 1 – Warum schreiben Sie?', opts: [3, 1.5, 0] },
  { k: 'lp2', label: 'Ý 2 – Bitte: Kulturprogramm', opts: [3, 1.5, 0] },
  { k: 'lp3', label: 'Ý 3 – Frage: Hoteladressen', opts: [3, 1.5, 0] },
  { k: 'kg', label: 'Anrede, Gruß, cách trình bày', opts: [1, 0.5, 0] },
];

export default function AttemptPage() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [t1, setT1] = useState({});
  const [t2, setT2] = useState({});
  const [sprechen, setSprechen] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    rpc(adminDb, 'exam_admin_attempt', { p_attempt_id: id }).then((r) => {
      setD(r);
      const a = r.attempt;
      const fields = r.items.filter((i) => i.section === 'schreiben' && i.kind !== 'essay');
      setT1(a.schreiben_t1_detail || Object.fromEntries(fields.map((f) => [f.id, f.suggest?.ok ? 1 : 0])));
      setT2(a.schreiben_t2_detail || {});
      setSprechen(a.sprechen ?? '');
      setNote(a.teacher_note || '');
    }).catch((e) => setErr(friendly(e)));
  }, [id]);

  const t1Sum = useMemo(() => Object.values(t1).reduce((s, v) => s + Number(v || 0), 0), [t1]);
  const t2Done = T2_CRITERIA.every((c) => t2[c.k] !== undefined);
  const t2Sum = T2_CRITERIA.reduce((s, c) => s + Number(t2[c.k] || 0), 0);

  if (!d) return <div className="mx-auto max-w-[1100px] px-6 py-10">{err ? <Banner tone="warn">{err}</Banner> : <Spinner />}</div>;

  const a = d.attempt;
  const by = (sec) => d.items.filter((i) => i.section === sec);
  const fields = by('schreiben').filter((i) => i.kind !== 'essay');
  const essay = by('schreiben').find((i) => i.kind === 'essay');

  async function saveGrades() {
    setSaving(true); setErr(''); setMsg('');
    const sp = sprechen === '' ? null : Number(sprechen);
    if (sp !== null && (Number.isNaN(sp) || sp < 0 || sp > 25)) { setErr('Điểm Sprechen phải từ 0 đến 25.'); setSaving(false); return; }
    try {
      await rpc(adminDb, 'exam_admin_save_grades', {
        p_attempt_id: a.id, p_t1: t1Sum, p_t1_detail: t1, p_t2: t2Done ? t2Sum : null, p_t2_detail: t2,
        p_sprechen: sp, p_note: note || null,
      });
      setMsg('Đã lưu điểm lúc ' + timeOf(new Date().toISOString()));
    } catch (e) { setErr(friendly(e)); } finally { setSaving(false); }
  }

  const schreiben25 = t2Done ? Math.round(((t1Sum + t2Sum) * 25 / 15) * 10) / 10 : null;
  const h25 = Math.round(d.hoeren_raw * 25 / 15 * 10) / 10;
  const l25 = Math.round(d.lesen_raw * 25 / 15 * 10) / 10;

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-8">
      <Link to={`/admin/buoi/${a.session_id}`} className="text-sm text-forest-500 hover:text-forest">← {d.session.title} · {d.session.code}</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-bblue">{a.full_name}</h1>
          <p className="mt-1 text-sm text-forest-500">
            {a.status === 'submitted' ? `Đã nộp lúc ${timeOf(a.submitted_at)}${a.submit_reason === 'session_finished' ? ' (tự động khi kết thúc)' : a.submit_reason === 'admin' ? ' (giáo viên thu bài)' : ''}` : 'Chưa nộp bài'}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[['Hören', h25], ['Lesen', l25], ['Schreiben', schreiben25], ['Sprechen', sprechen === '' ? null : Number(sprechen)]].map(([t, v]) => (
            <div key={t} className="rounded-lg border border-line bg-white px-4 py-2">
              <div className="text-xs text-forest-500">{t}</div>
              <div className="font-display text-xl font-bold tabular-nums">{fmtPts(v)}<span className="text-xs font-normal text-forest-500">/25</span></div>
            </div>
          ))}
        </div>
      </div>
      {err && <Banner tone="warn" className="mt-4">{err}</Banner>}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {[['hoeren', 'Hören', d.hoeren_raw], ['lesen', 'Lesen', d.lesen_raw]].map(([sec, label, raw]) => (
          <Card key={sec} className="p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-bold">{label}</h2>
              <span className="text-sm">{raw}/15 câu đúng</span>
            </div>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-forest-500"><tr><th className="py-1">Câu</th><th>Học viên</th><th>Đáp án</th><th /></tr></thead>
              <tbody>
                {by(sec).map((i) => (
                  <tr key={i.id} className="border-t border-line">
                    <td className="py-1.5 font-semibold">{i.data.num}</td>
                    <td className={i.value ? '' : 'text-forest-300'}>{i.value || 'trống'}</td>
                    <td className="text-forest-500">{i.correct}</td>
                    <td className="text-right">{i.is_correct ? <span className="text-forest">✓</span> : <span className="text-alert">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold">Schreiben · Teil 1 <span className="text-sm font-normal text-forest-500">(1 điểm/mục)</span></h2>
          <span className="font-semibold">{t1Sum}/5</span>
        </div>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-forest-500"><tr><th className="py-1 pr-3">Mục</th><th className="pr-3">Học viên viết</th><th className="pr-3">Đáp án chính thức</th><th className="pr-3">Gợi ý</th><th className="text-right">Cho điểm</th></tr></thead>
          <tbody>
            {fields.map((f) => {
              const sg = f.suggest || { ok: false };
              return (
                <tr key={f.id} className="border-t border-line">
                  <td className="py-2 pr-3"><b>({f.data.num})</b> {f.data.label}</td>
                  <td className={`pr-3 ${f.value ? 'font-medium' : 'text-forest-300'}`}>{f.value || 'trống'}</td>
                  <td className="pr-3 text-forest-500">{f.correct}</td>
                  <td className="pr-3 text-xs">{sg.ok ? <span className="text-forest">khớp</span> : <span className="text-alert">không khớp</span>}{sg.note ? <div className="text-forest-500">{sg.note}</div> : null}</td>
                  <td className="text-right">
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 accent-bblue" checked={Number(t1[f.id]) === 1} onChange={(e) => setT1({ ...t1, [f.id]: e.target.checked ? 1 : 0 })} />
                      1 điểm
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="mt-6 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold">Schreiben · Teil 2 <span className="text-sm font-normal text-forest-500">(tối đa 10 điểm)</span></h2>
          <span className="font-semibold">{t2Done ? `${fmtPts(t2Sum)}/10` : 'chưa chấm đủ'}</span>
        </div>
        <div className="mt-3 grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="text-xs text-forest-500">{wordCount(essay?.value)} từ · lưu lúc {timeOf(essay?.updated_at)}</div>
            <div className="mt-2 min-h-[160px] whitespace-pre-wrap rounded-lg border border-line bg-paper px-4 py-3 text-[15px] leading-7">
              {essay?.value || <span className="text-forest-300">Học viên chưa viết.</span>}
            </div>
          </div>
          <div className="space-y-3">
            {T2_CRITERIA.map((c) => (
              <div key={c.k} data-crit={c.k}>
                <div className="text-sm font-medium">{c.label}</div>
                <div className="mt-1 inline-flex overflow-hidden rounded-lg border border-line">
                  {c.opts.map((o, i) => (
                    <button key={o} type="button" onClick={() => setT2({ ...t2, [c.k]: o })}
                      className={`px-3.5 py-1.5 text-sm font-semibold ${i ? 'border-l border-line' : ''} ${t2[c.k] === o ? 'bg-bblue text-white' : 'bg-white hover:bg-paper'}`}>
                      {fmtPts(o)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs leading-relaxed text-forest-500">Mỗi ý: đủ và hiểu được 3 · thiếu hoặc khó hiểu 1,5 · không có 0.</p>
          </div>
        </div>
      </Card>

      <Card className="mt-6 grid gap-6 p-5 md:grid-cols-[220px_1fr]">
        <div>
          <h2 className="font-display text-xl font-bold">Sprechen</h2>
          <label className="mt-3 block text-sm font-medium">Điểm (0–25)</label>
          <input type="number" min={0} max={25} step={0.5} value={sprechen} onChange={(e) => setSprechen(e.target.value)}
            className="mt-1 w-32 rounded-lg border border-line px-3 py-2 text-lg tabular-nums outline-none focus:border-bblue" />
        </div>
        <div>
          <label className="block text-sm font-medium">Nhận xét của giáo viên (không hiển thị cho học viên)</label>
          <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-bblue" />
        </div>
      </Card>

      <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-4 border-t border-line bg-paper/95 py-4 backdrop-blur">
        {msg && <span className="text-sm text-forest">{msg}</span>}
        <Button onClick={saveGrades} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu điểm'}</Button>
      </div>
    </div>
  );
}
