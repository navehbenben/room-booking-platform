import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import styles from './Header.module.scss';

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
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          Room<span>Book</span>
        </Link>

        <nav className={styles.nav}>
          <Link
            to="/search"
            className={[styles.navLink, isActive('/search') && styles.navLinkActive].filter(Boolean).join(' ')}
          >
            {t('header.searchRooms')}
          </Link>
          {isLoggedIn && (
            <>
              <Link
                to="/bookings"
                className={[styles.navLink, isActive('/bookings') && styles.navLinkActive].filter(Boolean).join(' ')}
              >
                {t('header.myBookings')}
              </Link>
              <Link
                to="/userprofile"
                className={[styles.navLink, isActive('/userprofile') && styles.navLinkActive].filter(Boolean).join(' ')}
              >
                {t('header.myProfile')}
              </Link>
            </>
          )}
        </nav>

        {/* Desktop auth — hidden on mobile */}
        <div className={`${styles.auth} ${styles.authDesktop}`}>
          <LanguageSwitcher />
          {isLoggedIn ? (
            <button className={styles.authBtn} onClick={handleLogout}>
              {t('header.signOut')}
            </button>
          ) : (
            <>
              <Link to="/login" className={styles.authLink}>
                {t('header.signIn')}
              </Link>
              <Link to="/register" className={styles.authBtn}>
                {t('header.register')}
              </Link>
            </>
          )}
        </div>

        {/* Hamburger button — visible on mobile only */}
        <button
          className={[styles.hamburger, menuOpen && styles.hamburgerOpen].filter(Boolean).join(' ')}
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
        <div className={styles.mobileMenu}>
          <Link
            to="/search"
            className={[styles.mobileLink, isActive('/search') && styles.mobileLinkActive].filter(Boolean).join(' ')}
          >
            {t('header.searchRooms')}
          </Link>
          {isLoggedIn ? (
            <>
              <Link
                to="/bookings"
                className={[styles.mobileLink, isActive('/bookings') && styles.mobileLinkActive]
                  .filter(Boolean)
                  .join(' ')}
              >
                {t('header.myBookings')}
              </Link>
              <Link
                to="/userprofile"
                className={[styles.mobileLink, isActive('/userprofile') && styles.mobileLinkActive]
                  .filter(Boolean)
                  .join(' ')}
              >
                {t('header.myProfile')}
              </Link>
              <div className={styles.mobileDivider} />
              <LanguageSwitcher />
              <button className={styles.mobileSignout} onClick={handleLogout}>
                {t('header.signOut')}
              </button>
            </>
          ) : (
            <>
              <div className={styles.mobileDivider} />
              <LanguageSwitcher />
              <Link to="/login" className={styles.mobileLink}>
                {t('header.signIn')}
              </Link>
              <Link to="/register" className={`${styles.mobileLink} ${styles.mobileLinkCta}`}>
                {t('header.register')}
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
