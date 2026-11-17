export const SECTIONS = [
  { key: 'hoeren', label: 'Hören', vi: 'Nghe' },
  { key: 'lesen', label: 'Lesen', vi: 'Đọc' },
  { key: 'schreiben', label: 'Schreiben', vi: 'Viết' },
];
export const PHASE_LABEL = { lobby: 'Chờ bắt đầu', hoeren: 'Hören', lesen: 'Lesen', schreiben: 'Schreiben', finished: 'Đã kết thúc' };

export function mmss(ms) {
  const t = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export function timeOf(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
export function dateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function wordCount(t) {
  return (t || '').trim().split(/\s+/).filter(Boolean).length;
}
export function fmtPts(v) {
  if (v === null || v === undefined || v === '') return '—';
  return Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}
// "In der *Sprachschule*" -> parts
export function emph(text) {
  return String(text || '').split(/(\*[^*]+\*)/g).filter(Boolean).map((p) => (p.startsWith('*') ? { b: p.slice(1, -1) } : { t: p }));
}
