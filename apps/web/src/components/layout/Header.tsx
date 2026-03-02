import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

type HeaderProps = {
  isLoggedIn: boolean;
  onLogout: () => void;
};

export function Header({ isLoggedIn, onLogout }: HeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await onLogout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__logo">
          Room<span>Book</span>
        </Link>

        <nav className="header__nav">
          <Link to="/search" className={`header__nav-link${isActive('/search') ? ' header__nav-link--active' : ''}`}>
            {t('header.searchRooms')}
          </Link>
          {isLoggedIn && (
            <>
              <Link
                to="/bookings"
                className={`header__nav-link${isActive('/bookings') ? ' header__nav-link--active' : ''}`}
              >
                {t('header.myBookings')}
              </Link>
              <Link
                to="/userprofile"
                className={`header__nav-link${isActive('/userprofile') ? ' header__nav-link--active' : ''}`}
              >
                {t('header.myProfile')}
              </Link>
            </>
          )}
        </nav>

        {/* Desktop auth — hidden on mobile */}
        <div className="header__auth header__auth--desktop">
          <LanguageSwitcher />
          {isLoggedIn ? (
            <button className="header__auth-btn" onClick={handleLogout}>
              {t('header.signOut')}
            </button>
          ) : (
            <>
              <Link to="/login" className="header__auth-link">
                {t('header.signIn')}
              </Link>
              <Link
                to="/register"
                className="header__auth-btn"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                {t('header.register')}
              </Link>
            </>
          )}
        </div>

        {/* Hamburger button — visible on mobile only */}
        <button
          className={`header__hamburger${menuOpen ? ' header__hamburger--open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? t('header.closeMenu') : t('header.openMenu')}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="header__mobile-menu">
          <Link
            to="/search"
            className={`header__mobile-link${isActive('/search') ? ' header__mobile-link--active' : ''}`}
          >
            {t('header.searchRooms')}
          </Link>
          {isLoggedIn ? (
            <>
              <Link
                to="/bookings"
                className={`header__mobile-link${isActive('/bookings') ? ' header__mobile-link--active' : ''}`}
              >
                {t('header.myBookings')}
              </Link>
              <Link
                to="/userprofile"
                className={`header__mobile-link${isActive('/userprofile') ? ' header__mobile-link--active' : ''}`}
              >
                {t('header.myProfile')}
              </Link>
              <div className="header__mobile-divider" />
              <LanguageSwitcher />
              <button className="header__mobile-signout" onClick={handleLogout}>
                {t('header.signOut')}
              </button>
            </>
          ) : (
            <>
              <div className="header__mobile-divider" />
              <LanguageSwitcher />
              <Link to="/login" className="header__mobile-link">
                {t('header.signIn')}
              </Link>
              <Link to="/register" className="header__mobile-link header__mobile-link--cta">
                {t('header.register')}
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
