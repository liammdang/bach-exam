import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key);

// Hai client tách biệt để giáo viên thử vai học viên trên cùng trình duyệt không bị đè phiên đăng nhập.
// Học viên không đăng nhập Supabase (xác thực bằng token riêng của bài thi).
export const studentDb = configured
  ? createClient(url, key, { auth: { storageKey: 'bach-exam-student', persistSession: false, autoRefreshToken: false } })
  : null;
export const adminDb = configured
  ? createClient(url, key, { auth: { storageKey: 'bach-exam-admin', persistSession: true, autoRefreshToken: true } })
  : null;
