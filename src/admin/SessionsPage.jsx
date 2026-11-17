import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminDb } from '../lib/supabase';
import { rpc } from '../lib/rpc';
import { friendly } from '../lib/errors';
import { PHASE_LABEL, dateTime } from '../lib/format';
import { Banner, Button, Card, Spinner } from '../components/ui';

export default function SessionsPage() {
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ title: 'A1.2 Abschlussprüfung', code: '', h: 20, l: 25, s: 15, max: 6 });
  const [busy, setBusy] = useState(false);

  const load = () => rpc(adminDb, 'exam_admin_list_sessions').then(setList).catch((e) => setErr(friendly(e)));
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const s = await rpc(adminDb, 'exam_admin_create_session', {
        p_title: form.title, p_code: form.code, p_dur_hoeren: form.h * 60, p_dur_lesen: form.l * 60,
        p_dur_schreiben: form.s * 60, p_max_students: Number(form.max),
      });
      nav(`/admin/buoi/${s.id}`);
    } catch (e2) { setErr(friendly(e2)); } finally { setBusy(false); }
  }
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });
  const input = 'mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-bblue';

  return (
    <div className="mx-auto grid max-w-[1280px] gap-8 px-6 py-8 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-bblue">Các buổi thi</h1>
        {err && <Banner tone="warn" className="mt-4">{err}</Banner>}
        {!list ? <div className="mt-8"><Spinner /></div> : list.length === 0 ? (
          <p className="mt-6 text-forest-500">Chưa có buổi thi nào. Tạo buổi đầu tiên ở khung bên phải.</p>
        ) : (
          <Card className="mt-6 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-forest-500">
                <tr><th className="px-4 py-3">Buổi thi</th><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Học viên</th><th className="px-4 py-3">Tạo lúc</th></tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-t border-line hover:bg-paper/60">
                    <td className="px-4 py-3"><Link className="font-semibold text-bblue hover:underline" to={`/admin/buoi/${s.id}`}>{s.title}</Link></td>
                    <td className="px-4 py-3 font-semibold tracking-[0.18em]">{s.code}</td>
                    <td className="px-4 py-3">{PHASE_LABEL[s.phase]}</td>
                    <td className="px-4 py-3">{s.n_students}/{s.max_students} · nộp {s.n_submitted}</td>
                    <td className="px-4 py-3 text-forest-500">{dateTime(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
      <form onSubmit={create}>
        <Card className="p-6">
          <h2 className="font-display text-xl font-bold">Tạo buổi thi mới</h2>
          <label className="mt-4 block text-sm font-medium">Tên buổi thi</label>
          <input className={input} {...f('title')} />
          <label className="mt-3 block text-sm font-medium">Mã truy cập <span className="font-normal text-forest-500">(để trống để tự tạo)</span></label>
          <input className={`${input} font-semibold uppercase tracking-[0.18em]`} {...f('code')} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} maxLength={12} />
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[['h', 'Hören'], ['l', 'Lesen'], ['s', 'Schreiben']].map(([k, t]) => (
              <div key={k}><label className="block text-sm font-medium">{t} <span className="text-forest-500">(phút)</span></label><input type="number" min={1} max={120} className={input} {...f(k)} /></div>
            ))}
          </div>
          <label className="mt-3 block text-sm font-medium">Số học viên tối đa</label>
          <input type="number" min={1} max={60} className={input} {...f('max')} />
          <Button type="submit" disabled={busy} className="mt-5 w-full">{busy ? 'Đang tạo…' : 'Tạo buổi thi'}</Button>
        </Card>
      </form>
    </div>
  );
}
