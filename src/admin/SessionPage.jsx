import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminDb } from '../lib/supabase';
import { rpc } from '../lib/rpc';
import { friendly } from '../lib/errors';
import { PHASE_LABEL, SECTIONS, fmtPts, mmss, timeOf } from '../lib/format';
import { Banner, Button, Card, Modal, Spinner } from '../components/ui';
import { exportCsv, exportXlsx } from './exportResults';

const NEXT = { lobby: 'hoeren', hoeren: 'lesen', lesen: 'schreiben', schreiben: 'finished' };
const NEXT_LABEL = { lobby: 'Bắt đầu Hören', hoeren: 'Chuyển sang Lesen', lesen: 'Chuyển sang Schreiben', schreiben: 'Kết thúc bài thi' };

export default function SessionPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [ov, setOv] = useState(null);
  const [offset, setOffset] = useState(0);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('live');
  const [results, setResults] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(null); // {title, body, run}
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef();

  const load = useCallback(async () => {
    try {
      const t0 = Date.now();
      const r = await rpc(adminDb, 'exam_admin_overview', { p_session_id: id }, { retries: 0 });
      setOffset(new Date(r.now).getTime() - (t0 + Date.now()) / 2);
      setOv(r);
      setErr('');
    } catch (e) { setErr(friendly(e)); }
  }, [id]);

  useEffect(() => {
    let stop = false;
    const loop = async () => { await load(); if (!stop) timer.current = setTimeout(loop, 3000); };
    loop();
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => { stop = true; clearTimeout(timer.current); clearInterval(t); };
  }, [load]);

  useEffect(() => {
    if (tab === 'results') rpc(adminDb, 'exam_admin_results', { p_session_id: id }).then(setResults).catch((e) => setErr(friendly(e)));
  }, [tab, id, ov?.session?.phase]);

  if (!ov) return <div className="mx-auto max-w-[1280px] px-6 py-10">{err ? <Banner tone="warn">{err}</Banner> : <Spinner />}</div>;

  const s = ov.session;
  const ends = s.phase_ends_at ? new Date(s.phase_ends_at).getTime() : null;
  const remaining = ends ? ends - (now + offset) : null;
  const running = ['hoeren', 'lesen', 'schreiben'].includes(s.phase);
  const link = `${window.location.origin}/?code=${s.code}`;

  async function act(fn, args) {
    setBusy(true);
    try { await rpc(adminDb, fn, args); await load(); } catch (e) { setErr(friendly(e)); } finally { setBusy(false); setConfirm(null); }
  }
  function nextPhase() {
    const to = NEXT[s.phase];
    const active = ov.attempts.filter((a) => a.status === 'active').length;
    const body = to === 'finished'
      ? `Tất cả bài chưa nộp (${active}) sẽ được nộp tự động. Học viên không sửa được nữa.`
      : to === 'hoeren'
        ? 'Đồng hồ Hören bắt đầu chạy cho cả lớp. Nhớ phát audio ngay sau khi bấm.'
        : `Phần ${PHASE_LABEL[s.phase]} sẽ khoá lại, học viên chuyển sang ${PHASE_LABEL[to]}.`;
    setConfirm({ title: NEXT_LABEL[s.phase] + '?', body, run: () => act('exam_admin_set_phase', { p_session_id: s.id, p_phase: to }) });
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-8">
      <Link to="/admin" className="text-sm text-forest-500 hover:text-forest">← Các buổi thi</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-bblue">{s.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span>Mã: <b className="text-base tracking-[0.2em]">{s.code}</b></span>
            <span className="text-forest-300">|</span>
            <span className="text-forest-500">{link}</span>
            <button className="font-semibold text-bblue hover:underline" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? 'Đã copy' : 'Copy link'}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => exportCsv(s).catch((e) => setErr(friendly(e)))}>Xuất CSV</Button>
          <Button variant="ghost" onClick={() => exportXlsx(s).catch((e) => setErr(friendly(e)))}>Xuất Excel</Button>
        </div>
      </div>
      {err && <Banner tone="warn" className="mt-4">{err}</Banner>}

      {/* Điều khiển */}
      <Card className="mt-6 flex flex-wrap items-center gap-6 p-5">
        <div className="flex items-center gap-2">
          {['lobby', ...SECTIONS.map((x) => x.key), 'finished'].map((p, i) => (
            <span key={p} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-4 bg-line" />}
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${s.phase === p ? 'bg-forest text-white' : 'text-forest-300'}`}>{PHASE_LABEL[p]}</span>
            </span>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {running && (
            <div className={`rounded-lg px-4 py-2 text-2xl font-bold tabular-nums ${remaining <= 0 ? 'bg-paper text-forest-500' : remaining < 120000 ? 'bg-alert-soft text-alert' : 'bg-bblue-50 text-bblue'}`}>
              {remaining <= 0 ? 'Hết giờ' : mmss(remaining)}
            </div>
          )}
          {running && <>
            <Button variant="ghost" disabled={busy} onClick={() => act('exam_admin_adjust_time', { p_session_id: s.id, p_seconds: 60 })}>+1 phút</Button>
            <Button variant="ghost" disabled={busy} onClick={() => act('exam_admin_adjust_time', { p_session_id: s.id, p_seconds: 300 })}>+5 phút</Button>
            <Button variant="ghost" disabled={busy || remaining <= 0} onClick={() => setConfirm({ title: 'Đóng phần này ngay?', body: 'Học viên không sửa được đáp án của phần này nữa.', run: () => act('exam_admin_adjust_time', { p_session_id: s.id, p_seconds: 0 }) })}>Hết giờ ngay</Button>
          </>}
          {s.phase !== 'finished' && (
            <Button variant={s.phase === 'schreiben' ? 'danger' : 'blue'} disabled={busy} onClick={nextPhase}>{NEXT_LABEL[s.phase]}</Button>
          )}
        </div>
      </Card>

      <div className="mt-6 flex gap-1 border-b border-line">
        {[['live', 'Theo dõi lớp'], ['results', 'Bảng điểm']].map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === k ? 'border-bblue text-bblue' : 'border-transparent text-forest-500 hover:text-forest'}`}>{t}</button>
        ))}
      </div>

      {tab === 'live' ? <LiveTable ov={ov} now={now + offset} onAction={(a, action, label) =>
        setConfirm({ title: label, body: `Học viên: ${a.full_name}`, run: () => act('exam_admin_attempt_action', { p_attempt_id: a.id, p_action: action }) })} />
        : <Results rows={results} />}

      <div className="mt-10 flex justify-end">
        <button className="text-sm text-alert hover:underline" onClick={() => setConfirm({ title: 'Xoá buổi thi?', body: 'Toàn bộ bài làm và điểm của buổi này sẽ bị xoá vĩnh viễn.', run: async () => { await act('exam_admin_delete_session', { p_session_id: s.id }); nav('/admin'); } })}>
          Xoá buổi thi
        </button>
      </div>

      <Modal open={!!confirm} title={confirm?.title} onClose={() => !busy && setConfirm(null)}
        actions={<><Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>Huỷ</Button><Button disabled={busy} onClick={() => confirm.run()}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</Button></>}>
        {confirm?.body}
      </Modal>
    </div>
  );
}

function LiveTable({ ov, now, onAction }) {
  const t = ov.totals || {};
  if (!ov.attempts.length) {
    return <p className="mt-8 text-forest-500">Chưa có học viên nào vào phòng. Gửi link hoặc mã ở trên cho lớp.</p>;
  }
  return (
    <Card className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="bg-paper text-left text-forest-500">
          <tr>
            <th className="px-4 py-3">Học viên</th>
            <th className="px-4 py-3">Trạng thái</th>
            {SECTIONS.map((x) => <th key={x.key} className="px-4 py-3">{x.label}</th>)}
            <th className="px-4 py-3">Câu còn trống</th>
            <th className="px-4 py-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {ov.attempts.map((a) => {
            const online = now - new Date(a.last_seen_at).getTime() < 15000;
            const cur = ov.session.phase;
            // chỉ hiện câu trống của phần đang thi và các phần đã qua
            const curIdx = cur === 'finished' ? 3 : SECTIONS.findIndex((x) => x.key === cur);
            const miss = Object.fromEntries(Object.entries(a.missing || {}).filter(([k]) => SECTIONS.findIndex((x) => x.key === k) <= curIdx));
            return (
              <tr key={a.id} className="border-t border-line align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold">{a.full_name}</div>
                  <div className="text-xs text-forest-500">vào lúc {timeOf(a.joined_at)}</div>
                </td>
                <td className="px-4 py-3">
                  {a.status === 'submitted' ? (
                    <span className="rounded-full bg-lime-soft px-2.5 py-1 text-xs font-semibold text-forest">Đã nộp {timeOf(a.submitted_at)}</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${online ? 'text-forest' : 'text-alert'}`}>
                      <span className={`h-2 w-2 rounded-full ${online ? 'bg-lime-dark' : 'bg-alert'}`} />{online ? 'Đang làm' : 'Mất kết nối'}
                    </span>
                  )}
                  {a.rejoin_allowed && <div className="mt-1 text-xs text-bblue">Đang chờ vào lại</div>}
                </td>
                {SECTIONS.map((x) => (
                  <td key={x.key} className={`px-4 py-3 tabular-nums ${cur === x.key ? 'font-semibold' : ''}`}>
                    {a.answered?.[x.key] ?? 0}/{t[x.key] ?? '—'}
                    {x.key !== 'schreiben' && <div className="text-xs text-forest-500">đúng {x.key === 'hoeren' ? a.hoeren_raw : a.lesen_raw}</div>}
                  </td>
                ))}
                <td className="px-4 py-3 text-xs leading-relaxed">
                  {SECTIONS.filter((x) => miss[x.key]?.length).map((x) => (
                    <div key={x.key}><span className="text-forest-500">{x.label}:</span> {miss[x.key].join(', ')}</div>
                  ))}
                  {!SECTIONS.some((x) => miss[x.key]?.length) && <span className="text-forest-500">Không còn</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link to={`/admin/bai/${a.id}`} className="font-semibold text-bblue hover:underline">Xem & chấm</Link>
                  <details className="relative ml-3 inline-block text-left">
                    <summary className="cursor-pointer list-none text-forest-500 hover:text-forest">⋯</summary>
                    <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-line bg-white p-1 shadow-lg">
                      {[
                        ['allow_rejoin', 'Cho vào lại (đổi máy)'],
                        a.status === 'submitted' ? ['reopen', 'Mở lại bài đã nộp'] : ['force_submit', 'Thu bài ngay'],
                        ['delete', 'Xoá học viên'],
                      ].map(([k, l]) => (
                        <button key={k} onClick={() => onAction(a, k, l)} className={`block w-full rounded px-3 py-2 text-left text-sm hover:bg-paper ${k === 'delete' ? 'text-alert' : ''}`}>{l}</button>
                      ))}
                    </div>
                  </details>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function Results({ rows }) {
  if (!rows) return <div className="mt-8"><Spinner /></div>;
  if (!rows.length) return <p className="mt-8 text-forest-500">Chưa có dữ liệu.</p>;
  return (
    <Card className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-paper text-left text-forest-500">
          <tr>
            <th className="px-4 py-3">Học viên</th>
            <th className="px-4 py-3">Hören /25</th>
            <th className="px-4 py-3">Lesen /25</th>
            <th className="px-4 py-3">Schreiben /25</th>
            <th className="px-4 py-3">Sprechen /25</th>
            <th className="px-4 py-3">Tổng /100</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="px-4 py-3 font-semibold">{r.full_name}</td>
              <td className="px-4 py-3 tabular-nums">{fmtPts(r.hoeren)} <span className="text-xs text-forest-500">({r.hoeren_raw}/15)</span></td>
              <td className="px-4 py-3 tabular-nums">{fmtPts(r.lesen)} <span className="text-xs text-forest-500">({r.lesen_raw}/15)</span></td>
              <td className="px-4 py-3 tabular-nums">{r.schreiben === null ? <span className="text-forest-500">chưa chấm</span> : fmtPts(r.schreiben)}</td>
              <td className="px-4 py-3 tabular-nums">{r.sprechen === null ? <span className="text-forest-500">chưa nhập</span> : fmtPts(r.sprechen)}</td>
              <td className="px-4 py-3 font-display text-base font-bold tabular-nums">{fmtPts(r.total)}</td>
              <td className="px-4 py-3 text-right"><Link to={`/admin/bai/${r.id}`} className="font-semibold text-bblue hover:underline">Chấm</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-3 text-xs text-forest-500">
        Hören, Lesen: số câu đúng × 25/15. Schreiben: (Teil 1 /5 + Teil 2 /10) × 25/15. Tổng chỉ hiện khi đã chấm Schreiben và nhập Sprechen.
      </p>
    </Card>
  );
}
