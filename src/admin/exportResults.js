import { adminDb } from '../lib/supabase';
import { rpc } from '../lib/rpc';

const PREFIX = { hoeren: 'H', lesen: 'L', schreiben: 'S' };

async function collect(session) {
  const [results, blocksRes, keysRes] = await Promise.all([
    rpc(adminDb, 'exam_admin_results', { p_session_id: session.id }),
    adminDb.from('exam_blocks').select('id, section, position, data, scored').eq('scored', true).order('position'),
    adminDb.from('exam_answer_keys').select('block_id, correct'),
  ]);
  if (blocksRes.error) throw blocksRes.error;
  if (keysRes.error) throw keysRes.error;
  const blocks = blocksRes.data;
  const keys = Object.fromEntries(keysRes.data.map((k) => [k.block_id, k.correct]));
  const n = (v) => (v === null || v === undefined ? '' : Number(v));

  const scoreHead = ['Họ tên', 'Trạng thái', 'Nộp lúc', 'Hören (câu đúng/15)', 'Hören (/25)', 'Lesen (câu đúng/15)', 'Lesen (/25)',
    'Schreiben T1 (/5)', 'Schreiben T2 (/10)', 'Schreiben (/25)', 'Sprechen (/25)', 'Tổng (/100)', 'Ghi chú'];
  const scoreRows = results.map((r) => [
    r.full_name, r.status === 'submitted' ? 'Đã nộp' : 'Đang làm', r.submitted_at ? new Date(r.submitted_at).toLocaleString('vi-VN') : '',
    r.hoeren_raw, n(r.hoeren), r.lesen_raw, n(r.lesen), n(r.schreiben_t1), n(r.schreiben_t2), n(r.schreiben), n(r.sprechen), n(r.total), r.teacher_note || '',
  ]);

  const qHead = ['Họ tên', ...blocks.map((b) => `${PREFIX[b.section]}${b.data.num}`)];
  const keyRow = ['ĐÁP ÁN', ...blocks.map((b) => (b.section === 'schreiben' && b.data.num === 6 ? '(GV chấm)' : keys[b.id] || ''))];
  const ansRows = results.map((r) => [r.full_name, ...blocks.map((b) => r.answers?.[b.id] ?? '')]);
  return { scoreHead, scoreRows, qHead, keyRow, ansRows };
}

function fileBase(session) {
  const d = new Date().toISOString().slice(0, 10);
  return `ket-qua_${session.code}_${d}`;
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function exportCsv(session) {
  const { scoreHead, scoreRows } = await collect(session);
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [scoreHead, ...scoreRows].map((r) => r.map(esc).join(',')).join('\r\n');
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${fileBase(session)}.csv`);
}

export async function exportXlsx(session) {
  const XLSX = await import('xlsx');
  const { scoreHead, scoreRows, qHead, keyRow, ansRows } = await collect(session);
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([scoreHead, ...scoreRows]);
  ws1['!cols'] = scoreHead.map((h, i) => ({ wch: i === 0 ? 26 : i === scoreHead.length - 1 ? 40 : 14 }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Diem');
  const ws2 = XLSX.utils.aoa_to_sheet([qHead, keyRow, ...ansRows]);
  ws2['!cols'] = qHead.map((h, i) => ({ wch: i === 0 ? 26 : h === 'S6' ? 60 : 8 }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Bai lam');
  XLSX.writeFile(wb, `${fileBase(session)}.xlsx`);
}
