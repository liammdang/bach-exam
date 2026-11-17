import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { adminDb } from '../lib/supabase';
import { rpc } from '../lib/rpc';
import { friendly } from '../lib/errors';
import { Logo } from '../components/Brand';
import { Banner, Button, Spinner } from '../components/ui';

export default function AdminLayout() {
  const [session, setSession] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    adminDb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = adminDb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    rpc(adminDb, 'exam_whoami').then((r) => setIsAdmin(!!r.is_admin)).catch(() => setIsAdmin(false));
  }, [session?.user?.id]); // eslint-disable-line

  if (session === undefined) return <Page><Spinner /></Page>;
  if (!session) return <Login />;
  if (isAdmin === null) return <Page><Spinner label="Đang kiểm tra quyền…" /></Page>;
  if (!isAdmin) {
    return (
      <Page>
        <Banner tone="warn">Tài khoản {session.user.email} chưa được cấp quyền giáo viên. Chạy file supabase/04_cap_quyen_giao_vien.sql với email này.</Banner>
        <Button variant="ghost" className="mt-4" onClick={() => adminDb.auth.signOut()}>Đăng xuất</Button>
      </Page>
    );
  }
  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-forest text-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3">
          <Link to="/admin" className="flex items-center gap-4">
            <Logo className="h-8" light />
            <span className="h-6 w-px bg-white/25" />
            <span className="font-display text-[15px] font-bold">Quản lý bài thi</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/75">{session.user.email}</span>
            <Button variant="lime" className="py-1.5" onClick={() => adminDb.auth.signOut()}>Đăng xuất</Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function Page({ children }) {
  return <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">{children}</div>;
}

function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await adminDb.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) setErr(error.message === 'Invalid login credentials' ? 'Sai email hoặc mật khẩu.' : friendly(error));
    setBusy(false);
  }
  return (
    <Page>
      <Logo className="h-10 self-start" />
      <form onSubmit={go} className="mt-8 rounded-xl border border-line bg-white p-7">
        <h1 className="font-display text-2xl font-extrabold text-bblue">Đăng nhập giáo viên</h1>
        <label className="mt-5 block text-sm font-medium">Email</label>
        <input type="email" className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 outline-none focus:border-bblue" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <label className="mt-4 block text-sm font-medium">Mật khẩu</label>
        <input type="password" className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 outline-none focus:border-bblue" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        {err && <Banner tone="warn" className="mt-4">{err}</Banner>}
        <Button type="submit" disabled={busy} className="mt-6 w-full py-3">{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</Button>
      </form>
    </Page>
  );
}
