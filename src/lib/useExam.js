import { useCallback, useEffect, useRef, useState } from 'react';
import { studentDb } from './supabase';
import { rpc } from './rpc';
import { errorCode, friendly, isNetworkError } from './errors';
import { clearPending, loadPending, savePending } from './localStore';

const POLL_MS = 3000;

export function useExam(token) {
  const attemptId = token.slice(0, 16); // khoá lưu tạm trên máy
  const [state, setState] = useState(null); // kết quả get_state
  const [offset, setOffset] = useState(0); // server_now - client_now (ms)
  const [online, setOnline] = useState(true);
  const [fatal, setFatal] = useState(''); // lỗi không thể tiếp tục (vd. mất phiên)
  const [section, setSection] = useState(null); // { section, blocks }
  const [answers, setAnswers] = useState({});
  const [images, setImages] = useState({});
  const [save, setSave] = useState({ status: 'idle', at: null, msg: '' });
  const [now, setNow] = useState(Date.now());

  const pending = useRef(loadPending(attemptId));
  const flushing = useRef(false);
  const flushTimer = useRef(null);
  const retryDelay = useRef(2000);
  const loadedKey = useRef('');
  const sectionRef = useRef(null);
  sectionRef.current = section;

  // ---- đồng hồ hiển thị
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // ---- tải nội dung phần đang thi
  const loadSection = useCallback(async () => {
    const res = await rpc(studentDb, 'exam_section', { p_token: token });
    if (!res.section) {
      setSection(null);
      return;
    }
    const ids = new Set(res.blocks.filter((b) => b.scored).map((b) => b.id));
    // Đáp án chờ gửi của phần trước (nếu có) không còn gửi được nữa
    for (const k of Object.keys(pending.current)) if (!ids.has(k)) delete pending.current[k];
    savePending(attemptId, pending.current);
    setAnswers({ ...res.responses, ...pending.current });
    setSection({ section: res.section, blocks: res.blocks });
    setImages(res.images || {});
    if (Object.keys(pending.current).length) scheduleFlush(50);
  }, [attemptId]); // eslint-disable-line

  // ---- vòng lặp đồng bộ trạng thái với server
  useEffect(() => {
    let stop = false;
    let timer;
    async function tick() {
      try {
        const t0 = Date.now();
        const s = await rpc(studentDb, 'exam_state', { p_token: token }, { retries: 0 });
        const t1 = Date.now();
        if (stop) return;
        setOffset(new Date(s.now).getTime() - (t0 + t1) / 2);
        setState(s);
        setOnline(true);
        const key = `${s.phase}|${s.status}|${s.phase_started_at}`;
        if (key !== loadedKey.current) {
          loadedKey.current = key;
          if (s.status === 'active' && ['hoeren', 'lesen', 'schreiben'].includes(s.phase)) {
            await loadSection();
          } else {
            setSection(null);
          }
        }
        if (Object.keys(pending.current).length && !flushing.current) scheduleFlush(100);
      } catch (e) {
        if (stop) return;
        if (isNetworkError(e)) setOnline(false);
        else if (['ATTEMPT_NOT_FOUND', 'NOT_AUTHENTICATED'].includes(errorCode(e))) setFatal(friendly(e));
        else setOnline(false);
        loadedKey.current = loadedKey.current || '';
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    }
    tick();
    const onOnline = () => { clearTimeout(timer); tick(); };
    window.addEventListener('online', onOnline);
    return () => { stop = true; clearTimeout(timer); window.removeEventListener('online', onOnline); };
  }, [attemptId, loadSection]); // eslint-disable-line

  // ---- gửi đáp án
  const flush = useCallback(async () => {
    if (flushing.current) return;
    const snapshot = { ...pending.current };
    if (!Object.keys(snapshot).length) return;
    flushing.current = true;
    setSave((s) => ({ ...s, status: 'saving' }));
    try {
      const res = await rpc(studentDb, 'exam_save', { p_token: token, p_values: snapshot }, { retries: 0 });
      for (const [k, v] of Object.entries(snapshot)) if (pending.current[k] === v) delete pending.current[k];
      savePending(attemptId, pending.current);
      retryDelay.current = 2000;
      setOnline(true);
      setSave({ status: 'saved', at: res.at, msg: '' });
    } catch (e) {
      const code = errorCode(e);
      if (['PHASE_CLOSED', 'ALREADY_SUBMITTED', 'WRONG_SECTION'].includes(code)) {
        pending.current = {};
        clearPending(attemptId);
        setSave({ status: 'locked', at: null, msg: friendly(e) });
      } else {
        setOnline(!isNetworkError(e));
        setSave({ status: 'offline', at: null, msg: friendly(e) });
        const d = retryDelay.current;
        retryDelay.current = Math.min(d * 2, 15000);
        flushing.current = false;
        scheduleFlush(d);
        return;
      }
    }
    flushing.current = false;
    if (Object.keys(pending.current).length) scheduleFlush(300);
  }, [attemptId]); // eslint-disable-line

  function scheduleFlush(ms) {
    clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => flush(), ms);
  }

  const setAnswer = useCallback((id, value, isText = false) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    pending.current = { ...pending.current, [id]: value };
    savePending(attemptId, pending.current);
    setSave((s) => ({ ...s, status: 'dirty' }));
    scheduleFlush(isText ? 1200 : 250);
  }, [attemptId]); // eslint-disable-line

  // Cảnh báo khi đóng tab còn đáp án chưa gửi
  useEffect(() => {
    const h = (e) => {
      if (Object.keys(pending.current).length) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  const submit = useCallback(async () => {
    // gửi nốt phần chưa lưu trước khi nộp
    clearTimeout(flushTimer.current);
    if (Object.keys(pending.current).length) {
      const snapshot = { ...pending.current };
      await rpc(studentDb, 'exam_save', { p_token: token, p_values: snapshot }, { retries: 3 });
      pending.current = {};
      clearPending(attemptId);
    }
    await rpc(studentDb, 'exam_submit', { p_token: token }, { retries: 3 });
    const s = await rpc(studentDb, 'exam_state', { p_token: token });
    setState(s);
    setSection(null);
  }, [attemptId]);

  const next = useCallback(async () => {
    clearTimeout(flushTimer.current);
    if (Object.keys(pending.current).length) {
      const snapshot = { ...pending.current };
      await rpc(studentDb, 'exam_save', { p_token: token, p_values: snapshot }, { retries: 3 }).catch(() => {});
      pending.current = {};
      clearPending(attemptId);
    }
    await rpc(studentDb, 'exam_next', { p_token: token }, { retries: 3 });
    const s = await rpc(studentDb, 'exam_state', { p_token: token });
    loadedKey.current = `${s.phase}|${s.status}|${s.phase_started_at}`;
    setState(s);
    if (s.status === 'active' && ['hoeren', 'lesen', 'schreiben'].includes(s.phase)) await loadSection();
    else setSection(null);
    window.scrollTo(0, 0);
  }, [attemptId, loadSection]); // eslint-disable-line

  const endsAt = state?.phase_ends_at ? new Date(state.phase_ends_at).getTime() : null;
  const remaining = endsAt ? endsAt - (now + offset) : null;
  const locked = !state || state.status !== 'active' || !endsAt || remaining <= 0;
  const pendingCount = Object.keys(pending.current).length;

  return { state, section, answers, images, save, online, fatal, remaining, locked, pendingCount, setAnswer, submit, next, flushNow: flush };
}
