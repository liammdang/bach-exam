import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useExam } from '../lib/useExam';
import { loadAttempt, clearAttempt } from '../lib/localStore';
import { SECTIONS, mmss, timeOf } from '../lib/format';
import { friendly } from '../lib/errors';
import { Logo, SourceNote } from '../components/Brand';
import { Block } from '../components/Blocks';
import { Banner, Button, Modal, Spinner } from '../components/ui';

export default function ExamPage() {
  const saved = loadAttempt();
  if (!saved?.token) return <Navigate to="/" replace />;
  return <Exam token={saved.token} />;
}

function Stepper({ phase }) {
  const idx = SECTIONS.findIndex((s) => s.key === phase);
  const doneAll = phase === 'finished';
  return (
    <ol className="hidden items-center gap-1 md:flex">
      {SECTIONS.map((s, i) => {
        const active = i === idx;
        const done = doneAll || (idx > -1 && i < idx);
        return (
          <li key={s.key} className="flex items-center gap-1">
            {i > 0 && <span className="mx-1 h-px w-6 bg-line" />}
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${active ? 'bg-forest text-white' : done ? 'bg-lime-soft text-forest' : 'text-forest-300'}`}>
              {done && !active ? '✓ ' : ''}{s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Timer({ remaining, open }) {
  if (remaining === null) return null;
  const low = remaining < 2 * 60 * 1000;
  const over = remaining <= 0 || !open;
  return (
    <div className={`rounded-lg px-3.5 py-1.5 text-lg font-bold tabular-nums ${over ? 'bg-paper text-forest-500' : low ? 'bg-alert-soft text-alert' : 'bg-bblue-50 text-bblue'}`}
      title="Thời gian còn lại của phần này">
      {over ? 'Hết giờ' : mmss(remaining)}
    </div>
  );
}

function SaveStatus({ save, online, pendingCount }) {
  if (!online) return <span className="text-alert">● Mất kết nối, bài vẫn được giữ trên máy và sẽ tự gửi lại</span>;
  if (save.status === 'saving' || save.status === 'dirty' || pendingCount) return <span className="text-forest-500">● Đang lưu…</span>;
  if (save.status === 'saved') return <span className="text-forest">✓ Đã lưu lúc {timeOf(save.at)}</span>;
  if (save.status === 'locked') return <span className="text-forest-500">{save.msg}</span>;
  return <span className="text-forest-500">Đáp án tự lưu khi bạn chọn</span>;
}

function Exam({ token }) {
  const nav = useNavigate();
  const ex = useExam(token);
  const { state, section, answers, images, locked } = ex;
  const [confirm, setConfirm] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const scored = useMemo(() => (section?.blocks || []).filter((b) => b.scored), [section]);
  const answeredCount = scored.filter((b) => (answers[b.id] || '').trim() !== '').length;
  const missing = scored.filter((b) => (answers[b.id] || '').trim() === '');

  function goto(id) {
    document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function doSubmit() {
    setSubmitting(true);
    setSubmitErr('');
    try {
      await ex.submit();
      setConfirm(false);
    } catch (e) {
      setSubmitErr(friendly(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (ex.fatal) {
    return (
      <Shell state={state}>
        <Center>
          <Banner tone="warn">{ex.fatal}</Banner>
          <Button variant="ghost" className="mt-4" onClick={() => { clearAttempt(); nav('/'); }}>Về trang đầu</Button>
        </Center>
      </Shell>
    );
  }
  if (!state) return <Shell><Center><Spinner label="Đang kết nối phòng thi…" /></Center></Shell>;

  const header = (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-4 px-8">
        <div className="flex items-center gap-4">
          <Logo className="h-8" />
          <span className="hidden h-6 w-px bg-line lg:block" />
          <span className="hidden font-display text-[15px] font-bold text-forest lg:block">A1.2 Abschlussprüfung</span>
        </div>
        <Stepper phase={state.phase} />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-forest-500 sm:block">{state.name}</span>
          {state.status === 'active' && ['hoeren', 'lesen', 'schreiben'].includes(state.phase) && <Timer remaining={ex.remaining} open={state.phase_open} />}
        </div>
      </div>
      {!ex.online && <div className="bg-alert-soft py-1.5 text-center text-sm text-alert">Mất kết nối mạng. Đáp án vẫn được giữ trên máy và sẽ tự gửi khi có mạng lại, đừng đóng trình duyệt.</div>}
    </header>
  );

  if (state.status === 'submitted' || state.phase === 'finished') {
    return (
      <Shell header={header}>
        <Center>
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime text-2xl text-forest">✓</div>
            <h1 className="mt-5 font-display text-3xl font-extrabold text-bblue">Bài thi đã được nộp</h1>
            <p className="mt-3 text-forest">
              Cảm ơn {state.name}. {state.submitted_at ? `Bài nộp lúc ${timeOf(state.submitted_at)}.` : ''} Cô sẽ chấm và báo kết quả sau.
            </p>
            <p className="mt-1 text-sm text-forest-500">Bạn có thể đóng trang này.</p>
          </div>
        </Center>
      </Shell>
    );
  }

  if (state.phase === 'lobby') {
    return (
      <Shell header={header}>
        <Center>
          <div className="text-center">
            <Spinner label="" />
            <h1 className="mt-4 font-display text-3xl font-extrabold text-bblue">Chờ cô bắt đầu bài thi</h1>
            <p className="mt-3 text-forest">Xin chào {state.name}, bạn đã vào phòng thi <b className="tracking-[0.14em]">{state.code}</b>.</p>
            <p className="mt-1 text-sm text-forest-500">Trang sẽ tự chuyển sang phần Hören khi cô bấm bắt đầu. Hãy chuẩn bị tai nghe và vào Google Meet/Zoom.</p>
          </div>
        </Center>
      </Shell>
    );
  }

  const sec = SECTIONS.find((s) => s.key === state.phase);
  const timeUp = locked;

  return (
    <Shell header={header}>
      <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-6 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg font-bold">{sec?.label}</h3>
              <span className="text-sm text-forest-500">{answeredCount}/{scored.length}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
              <div className="h-full bg-lime-dark transition-all" style={{ width: `${scored.length ? (answeredCount / scored.length) * 100 : 0}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {scored.map((b) => {
                const done = (answers[b.id] || '').trim() !== '';
                return (
                  <button key={b.id} type="button" onClick={() => goto(b.id)}
                    title={done ? 'Đã trả lời' : 'Chưa trả lời'}
                    className={`h-9 rounded-md text-sm font-semibold transition ${done ? 'bg-forest text-white' : 'border border-line bg-white text-forest hover:border-forest-300'}`}>
                    {b.data.num}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-forest-500">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-forest" />Đã làm</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-line" />Chưa làm</span>
            </div>
            {missing.length > 0 && !timeUp && (
              <button type="button" onClick={() => goto(missing[0].id)} className="mt-4 w-full rounded-md bg-paper py-2 text-sm font-medium text-forest hover:bg-cream">
                Đến câu chưa làm ({missing[0].data.num})
              </button>
            )}
            <div className="mt-4 border-t border-line pt-3 text-xs leading-relaxed">
              <SaveStatus save={ex.save} online={ex.online} pendingCount={ex.pendingCount} />
            </div>
          </div>
          {state.phase === 'schreiben' && (
            <Button variant="blue" className="mt-4 w-full py-3" onClick={() => setConfirm(true)}>Nộp bài</Button>
          )}
        </aside>

        <main className="min-w-0 space-y-4 pb-24">
          <div className="border-b border-line pb-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="font-display text-[34px] font-extrabold leading-none tracking-tight text-forest">{sec?.label}</h1>
              <span className="text-sm text-forest-500">
                {state.phase === 'hoeren' && 'Nghe audio cô phát qua Google Meet/Zoom và chọn đáp án.'}
                {state.phase === 'lesen' && 'Đọc kỹ từng văn bản rồi chọn đáp án.'}
                {state.phase === 'schreiben' && 'Viết xong thì bấm "Nộp bài" ở cột bên trái.'}
              </span>
            </div>
          </div>
          {timeUp && (
            <Banner tone="info">
              Phần {sec?.label} đã hết giờ, đáp án đã được ghi nhận. Chờ cô chuyển sang phần tiếp theo
              {state.phase === 'schreiben' ? ' hoặc bấm "Nộp bài".' : '.'}
            </Banner>
          )}
          {!section ? (
            <div className="py-16"><Spinner label="Đang tải đề…" /></div>
          ) : (
            section.blocks.map((b) => (
              <Block key={b.id} block={b} value={answers[b.id]} images={images} locked={timeUp} onChange={ex.setAnswer} />
            ))
          )}
          <SourceNote className="pt-8" />
        </main>
      </div>

      <Modal open={confirm} title="Nộp bài?" onClose={() => !submitting && setConfirm(false)}
        actions={<>
          <Button variant="ghost" disabled={submitting} onClick={() => setConfirm(false)}>Làm tiếp</Button>
          <Button variant="blue" disabled={submitting} onClick={doSubmit}>{submitting ? 'Đang nộp…' : 'Nộp bài'}</Button>
        </>}>
        {missing.length > 0
          ? <p>Phần Schreiben còn <b>{missing.length}</b> mục chưa làm ({missing.map((m) => m.data.num).join(', ')}).</p>
          : <p>Bạn đã làm đủ các mục của phần Schreiben.</p>}
        <p className="mt-2">Sau khi nộp, bạn sẽ không sửa được bài nữa.</p>
        {submitErr && <Banner tone="warn" className="mt-3">{submitErr}</Banner>}
      </Modal>
    </Shell>
  );
}

function Shell({ header, children }) {
  return <div className="min-h-screen bg-paper">{header}{children}</div>;
}
function Center({ children }) {
  return <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6">{children}</div>;
}
