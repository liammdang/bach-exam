// Bộ nhớ tạm trên máy học viên (chỉ để không mất bài khi mất mạng/tải lại; nguồn chuẩn vẫn là database)
const A = 'bach-exam-attempt';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export const loadAttempt = () => read(A, null);
export const saveAttempt = (v) => write(A, v);
export const clearAttempt = () => { try { localStorage.removeItem(A); } catch { /* ignore */ } };

// Câu trả lời chưa gửi được lên server: { [blockId]: value }
export const loadPending = (id) => read(`bach-exam-pending-${id}`, {});
export const savePending = (id, v) => write(`bach-exam-pending-${id}`, v);
export const clearPending = (id) => { try { localStorage.removeItem(`bach-exam-pending-${id}`); } catch { /* ignore */ } };
