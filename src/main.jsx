import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { configured } from './lib/supabase';
import StartPage from './pages/StartPage';
import ExamPage from './pages/ExamPage';
// Code giáo viên tách riêng, học viên không tải về
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const SessionsPage = lazy(() => import('./admin/SessionsPage'));
const SessionPage = lazy(() => import('./admin/SessionPage'));
const AttemptPage = lazy(() => import('./admin/AttemptPage'));

function NotConfigured() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-bold text-bblue">Chưa cấu hình Supabase</h1>
      <p className="mt-3 text-sm">Thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào biến môi trường (file .env hoặc Netlify → Site settings → Environment variables) rồi build lại.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {configured ? (
      <BrowserRouter>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/thi" element={<ExamPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<SessionsPage />} />
            <Route path="buoi/:id" element={<SessionPage />} />
            <Route path="bai/:id" element={<AttemptPage />} />
          </Route>
          <Route path="*" element={<StartPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    ) : <NotConfigured />}
  </React.StrictMode>
);
