import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { LandingPage } from '../pages/LandingPage';
import { SearchPage } from '../pages/SearchPage';
import { MyBookingsPage } from '../pages/MyBookingsPage';
import { RoomDetailPage } from '../pages/RoomDetailPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { GdprPage } from '../pages/GdprPage';
import { UserProfilePage } from '../pages/UserProfilePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';

function RequireAuth({ isLoggedIn, children }: { isLoggedIn: boolean; children: React.ReactElement }) {
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return children;
}

export function App() {
  const { t } = useTranslation();
  const { isLoggedIn, rehydrating, login, register, logout } = useAuth();

  if (rehydrating) {
    return (
      <div className="app">
        <Header isLoggedIn={false} onLogout={logout} />
        <main className="main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <span style={{ color: 'var(--c-muted)', fontSize: 15 }}>{t('app.loading')}</span>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app">
      <Header isLoggedIn={isLoggedIn} onLogout={logout} />
      <Routes>
        {/* Landing — always public */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth pages — redirect to /search if already logged in */}
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/search" replace /> : <LoginPage onLogin={login} />}
        />
        <Route
          path="/register"
          element={isLoggedIn ? <Navigate to="/search" replace /> : <RegisterPage onRegister={register} />}
        />

        {/* Search & room detail — public; auth only required to checkout */}
        <Route path="/search" element={<SearchPage isLoggedIn={isLoggedIn} />} />
        <Route path="/rooms/:roomId" element={<RoomDetailPage isLoggedIn={isLoggedIn} />} />

        {/* Protected routes */}
        <Route
          path="/bookings"
          element={
            <RequireAuth isLoggedIn={isLoggedIn}>
              <MyBookingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/checkout/:holdId"
          element={
            <RequireAuth isLoggedIn={isLoggedIn}>
              <CheckoutPage />
            </RequireAuth>
          }
        />
        <Route
          path="/userprofile"
          element={
            <RequireAuth isLoggedIn={isLoggedIn}>
              <UserProfilePage />
            </RequireAuth>
          }
        />

        {/* Always public */}
        <Route path="/privacy" element={<GdprPage isLoggedIn={isLoggedIn} onAccountDeleted={logout} />} />
      </Routes>
      <Footer />
    </div>
  );
}
