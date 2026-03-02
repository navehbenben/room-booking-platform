import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGdpr } from '../hooks/useGdpr';

interface GdprPageProps {
  isLoggedIn: boolean;
  onAccountDeleted: () => void;
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id: string;
}

function ToggleSwitch({ checked, onChange, label, id }: ToggleSwitchProps) {
  return (
    <label className="gdpr-toggle" htmlFor={id}>
      <span className="gdpr-toggle__label">{label}</span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`gdpr-toggle__btn${checked ? ' gdpr-toggle__btn--on' : ''}`}
      >
        <span className="gdpr-toggle__thumb" />
      </button>
    </label>
  );
}

export function GdprPage({ isLoggedIn, onAccountDeleted }: GdprPageProps) {
  const { t } = useTranslation();
  const { consent, updateConsent, exportData, exporting, exportError, deleteAccount, deleting, deleteError } =
    useGdpr(onAccountDeleted);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteAccount();
  };

  return (
    <div className="gdpr-page">
      {isLoggedIn ? (
        <Link to="/userprofile" className="gdpr-page__back">
          {t('gdpr.backToProfile')}
        </Link>
      ) : (
        <Link to="/" className="gdpr-page__back">
          {t('gdpr.back')}
        </Link>
      )}

      <h2 className="gdpr-page__title">{t('gdpr.title')}</h2>
      <p className="gdpr-page__intro">{t('gdpr.intro')}</p>

      {/* ── Consent Preferences ─────────────────────────────────────── */}
      <section className="gdpr-section">
        <h3 className="gdpr-section__title">{t('gdpr.consent.title')}</h3>
        <p className="gdpr-section__desc">{t('gdpr.consent.desc')}</p>
        <div className="gdpr-section__body">
          <ToggleSwitch
            id="consent-analytics"
            label={t('gdpr.consent.analyticsLabel')}
            checked={consent.analytics}
            onChange={(v) => updateConsent('analytics', v)}
          />
          <ToggleSwitch
            id="consent-marketing"
            label={t('gdpr.consent.marketingLabel')}
            checked={consent.marketing}
            onChange={(v) => updateConsent('marketing', v)}
          />
          <p className="gdpr-section__updated">
            {t('gdpr.consent.lastUpdated', { date: new Date(consent.updatedAt).toLocaleString() })}
          </p>
        </div>
      </section>

      {/* ── Right to Restriction ────────────────────────────────────── */}
      <section className="gdpr-section">
        <h3 className="gdpr-section__title">{t('gdpr.restriction.title')}</h3>
        <p className="gdpr-section__desc">{t('gdpr.restriction.desc')}</p>
        <div className="gdpr-section__body">
          <ToggleSwitch
            id="consent-restrict"
            label={t('gdpr.restriction.restrictLabel')}
            checked={consent.restrictProcessing}
            onChange={(v) => updateConsent('restrictProcessing', v)}
          />
        </div>
      </section>

      {/* ── Right to Access + Portability ───────────────────────────── */}
      <section className="gdpr-section">
        <h3 className="gdpr-section__title">{t('gdpr.access.title')}</h3>
        <p className="gdpr-section__desc">{t('gdpr.access.desc')}</p>
        <div className="gdpr-section__body">
          {isLoggedIn ? (
            <>
              <button className="btn btn--secondary" onClick={exportData} disabled={exporting}>
                {exporting ? t('gdpr.access.exportingBtn') : t('gdpr.access.exportBtn')}
              </button>
              {exportError && <p className="gdpr-error">{exportError}</p>}
            </>
          ) : (
            <p className="gdpr-section__login-hint">
              <Link to="/">{t('gdpr.access.loginLink')}</Link> {t('gdpr.access.loginHint')}
            </p>
          )}
        </div>
      </section>

      {/* ── Right to Erasure ────────────────────────────────────────── */}
      <section className="gdpr-section gdpr-section--danger">
        <h3 className="gdpr-section__title">{t('gdpr.erasure.title')}</h3>
        <p className="gdpr-section__desc">
          {t('gdpr.erasure.desc')} <strong>{t('gdpr.erasure.descStrong')}</strong>
        </p>
        <div className="gdpr-section__body">
          {isLoggedIn ? (
            <>
              {confirmDelete && (
                <p className="gdpr-confirm-msg">
                  {t('gdpr.erasure.confirmMsg')} <strong>{t('gdpr.erasure.confirmMsgStrong')}</strong> {t('gdpr.erasure.confirmMsgSuffix')}
                </p>
              )}
              <div className="gdpr-delete-row">
                <button
                  className={`btn btn--danger${confirmDelete ? ' btn--pulse' : ''}`}
                  onClick={handleDeleteClick}
                  disabled={deleting}
                >
                  {deleting
                    ? t('gdpr.erasure.deletingBtn')
                    : confirmDelete
                      ? t('gdpr.erasure.confirmDeleteBtn')
                      : t('gdpr.erasure.deleteBtn')}
                </button>
                {confirmDelete && !deleting && (
                  <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
                    {t('common.cancel')}
                  </button>
                )}
              </div>
              {deleteError && <p className="gdpr-error">{deleteError}</p>}
            </>
          ) : (
            <p className="gdpr-section__login-hint">
              <Link to="/">{t('gdpr.erasure.loginLink')}</Link> {t('gdpr.erasure.loginHint')}
            </p>
          )}
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────── */}
      <section className="gdpr-section">
        <h3 className="gdpr-section__title">{t('gdpr.contact.title')}</h3>
        <p className="gdpr-section__desc">
          {t('gdpr.contact.desc')} <a href={`mailto:${t('gdpr.contact.email')}`}>{t('gdpr.contact.email')}</a>{t('gdpr.contact.descSuffix')}
        </p>
      </section>
    </div>
  );
}
