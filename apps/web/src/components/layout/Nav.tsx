import React from 'react';
import { useTranslation } from 'react-i18next';

type Tab = 'login' | 'register' | 'search' | 'bookings';

type NavProps = {
  isLoggedIn: boolean;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function Nav({ isLoggedIn, tab, onTabChange }: NavProps) {
  const { t } = useTranslation();

  return (
    <nav className="nav">
      {!isLoggedIn ? (
        <>
          <button
            className={['nav__tab', tab === 'login' && 'nav__tab--active'].filter(Boolean).join(' ')}
            onClick={() => onTabChange('login')}
          >
            {t('nav.login')}
          </button>
          <button
            className={['nav__tab', tab === 'register' && 'nav__tab--active'].filter(Boolean).join(' ')}
            onClick={() => onTabChange('register')}
          >
            {t('nav.register')}
          </button>
        </>
      ) : (
        <>
          <button
            className={['nav__tab', tab === 'search' && 'nav__tab--active'].filter(Boolean).join(' ')}
            onClick={() => onTabChange('search')}
          >
            {t('nav.searchAndBook')}
          </button>
          <button
            className={['nav__tab', tab === 'bookings' && 'nav__tab--active'].filter(Boolean).join(' ')}
            onClick={() => onTabChange('bookings')}
          >
            {t('nav.myBookings')}
          </button>
        </>
      )}
    </nav>
  );
}
