import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { studentDb } from '../lib/supabase';
import { rpc } from '../lib/rpc';
import { friendly } from '../lib/errors';
import { Logo, SourceNote } from '../components/Brand';
import { Button, Banner } from '../components/ui';
import { loadAttempt, saveAttempt } from '../lib/localStore';

export default function StartPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [code, setCode] = useState((params.get('code') || '').toUpperCase());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const existing = loadAttempt();

  useEffect(() => {
    if (existing && !params.get('code')) setCode(existing.code || '');
  }, []); // eslint-disable-line

  async function start(e) {
    e.preventDefault();
    setErr('');
    if (name.trim().length < 2) return setErr('Vui lòng nhập họ và tên đầy đủ.');
    if (code.trim().length < 4) return setErr('Vui lòng nhập mã bài thi.');
    setBusy(true);
    try {
      const res = await rpc(studentDb, 'exam_join', { p_code: code.trim().toUpperCase(), p_name: name.trim() });
      saveAttempt({ token: res.token, code: code.trim().toUpperCase(), name: name.trim() });
      nav('/thi');
    } catch (e2) {
      setErr(friendly(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="h-1.5 bg-lime" />
      <div className="mx-auto flex min-h-[calc(100vh-6px)] max-w-5xl flex-col px-6 py-10">
        <Logo className="h-10 self-start" />
        <div className="mt-10 grid flex-1 items-start gap-10 md:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-500">Kiểm tra cuối khoá · Schritte plus Neu</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-bblue md:text-5xl">A1.2 Abschlussprüfung</h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-forest">
              Bài kiểm tra theo dạng đề Start Deutsch 1, gồm ba phần làm trên máy. Phần Sprechen cô sẽ kiểm tra riêng.
            </p>
            <ol className="mt-8 space-y-3 text-sm">
              {[
                ['Hören', '20 phút', 'Cô phát audio qua Google Meet/Zoom, bạn chọn đáp án trên web.'],
                ['Lesen', '25 phút', 'Đọc đoạn văn, quảng cáo, biển báo và chọn đáp án.'],
                ['Schreiben', '15 phút', 'Điền biểu mẫu và viết email khoảng 30 từ.'],
              ].map(([t, d, x], i) => (
                <li key={t} className="flex gap-4 rounded-lg border border-line bg-white px-4 py-3">
                  <span className="w-6 font-display text-xl font-bold text-bblue">{i + 1}</span>
                  <div>
                    <div className="font-semibold">{t} <span className="font-normal text-forest-500">· {d}</span></div>
                    <div className="text-forest-500">{x}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <form onSubmit={start} className="rounded-xl border border-line bg-white p-8">
            <h2 className="font-display text-xl font-bold text-forest">Vào phòng thi</h2>
            {existing && (
              <Banner tone="info" className="mt-4">
                Trình duyệt này đang có bài làm của <b>{existing.name}</b>.{' '}
                <button type="button" className="font-semibold underline" onClick={() => nav('/thi')}>Tiếp tục làm bài</button>
              </Banner>
            )}
            <label className="mt-5 block text-sm font-medium">Họ và tên</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-[#CFD7C3] px-3.5 py-2.5 outline-none focus:border-bblue focus:ring-2 focus:ring-bblue/15"
              value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Nguyễn Minh Anh" autoComplete="name" maxLength={80}
            />
            <label className="mt-4 block text-sm font-medium">Mã bài thi</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-[#CFD7C3] px-3.5 py-2.5 font-semibold uppercase tracking-[0.22em] outline-none focus:border-bblue focus:ring-2 focus:ring-bblue/15"
              value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="VD: K7M2QP" maxLength={12}
            />
            <ul className="mt-5 space-y-1.5 text-[13px] leading-relaxed text-forest-500">
              <li>· Đáp án tự lưu sau mỗi lần chọn, tải lại trang không mất bài.</li>
              <li>· Thời gian từng phần do cô điều khiển, cả lớp làm cùng lúc.</li>
              <li>· Bấm "Nộp bài" ở phần Schreiben. Nộp rồi thì không sửa được.</li>
            </ul>
            {err && <Banner tone="warn" className="mt-4">{err}</Banner>}
            <Button type="submit" disabled={busy} className="mt-6 w-full py-3 text-base">
              {busy ? 'Đang vào…' : 'Bắt đầu'}
            </Button>
          </form>
        </div>
        <SourceNote className="mt-12 max-w-3xl" />
      </div>
    </div>
  );
}
