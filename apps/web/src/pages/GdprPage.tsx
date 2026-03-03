import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGdpr } from '../hooks/useGdpr';
import { useAppSelector } from '../store/hooks';
import { selectIsLoggedIn } from '../store/slices/authSlice';
import styles from './GdprPage.module.scss';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id: string;
}

function ToggleSwitch({ checked, onChange, label, id }: ToggleSwitchProps) {
  return (
    <label className={styles.toggle} htmlFor={id}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={checked ? `${styles.toggleBtn} ${styles.toggleBtnOn}` : styles.toggleBtn}
      >
        <span className={styles.toggleThumb} />
      </button>
    </label>
  );
}

export function GdprPage() {
  const { t } = useTranslation();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const { consent, updateConsent, exportData, exporting, exportError, deleteAccount, deleting, deleteError } =
    useGdpr();

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteAccount();
  };

  return (
    <div className={styles.page}>
      {isLoggedIn ? (
        <Link to="/userprofile" className={styles.back}>
          {t('gdpr.backToProfile')}
        </Link>
      ) : (
        <Link to="/" className={styles.back}>
          {t('gdpr.back')}
        </Link>
      )}

      <h2 className={styles.title}>{t('gdpr.title')}</h2>
      <p className={styles.intro}>{t('gdpr.intro')}</p>

      {/* ── Consent Preferences ─────────────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('gdpr.consent.title')}</h3>
        <p className={styles.sectionDesc}>{t('gdpr.consent.desc')}</p>
        <div className={styles.sectionBody}>
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
          <p className={styles.sectionUpdated}>
            {t('gdpr.consent.lastUpdated', { date: new Date(consent.updatedAt).toLocaleString() })}
          </p>
        </div>
      </section>

      {/* ── Right to Restriction ────────────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('gdpr.restriction.title')}</h3>
        <p className={styles.sectionDesc}>{t('gdpr.restriction.desc')}</p>
        <div className={styles.sectionBody}>
          <ToggleSwitch
            id="consent-restrict"
            label={t('gdpr.restriction.restrictLabel')}
            checked={consent.restrictProcessing}
            onChange={(v) => updateConsent('restrictProcessing', v)}
          />
        </div>
      </section>

      {/* ── Right to Access + Portability ───────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('gdpr.access.title')}</h3>
        <p className={styles.sectionDesc}>{t('gdpr.access.desc')}</p>
        <div className={styles.sectionBody}>
          {isLoggedIn ? (
            <>
              <button className="btn btn--secondary" onClick={exportData} disabled={exporting}>
                {exporting ? t('gdpr.access.exportingBtn') : t('gdpr.access.exportBtn')}
              </button>
              {exportError && <p className={styles.error}>{exportError}</p>}
            </>
          ) : (
            <p className={styles.sectionLoginHint}>
              <Link to="/">{t('gdpr.access.loginLink')}</Link> {t('gdpr.access.loginHint')}
            </p>
          )}
        </div>
      </section>

      {/* ── Right to Erasure ────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.sectionDanger}`}>
        <h3 className={styles.sectionTitle}>{t('gdpr.erasure.title')}</h3>
        <p className={styles.sectionDesc}>
          {t('gdpr.erasure.desc')} <strong>{t('gdpr.erasure.descStrong')}</strong>
        </p>
        <div className={styles.sectionBody}>
          {isLoggedIn ? (
            <>
              {confirmDelete && (
                <p className={styles.confirmMsg}>
                  {t('gdpr.erasure.confirmMsg')} <strong>{t('gdpr.erasure.confirmMsgStrong')}</strong>{' '}
                  {t('gdpr.erasure.confirmMsgSuffix')}
                </p>
              )}
              <div className={styles.deleteRow}>
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
              {deleteError && <p className={styles.error}>{deleteError}</p>}
            </>
          ) : (
            <p className={styles.sectionLoginHint}>
              <Link to="/">{t('gdpr.erasure.loginLink')}</Link> {t('gdpr.erasure.loginHint')}
            </p>
          )}
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('gdpr.contact.title')}</h3>
        <p className={styles.sectionDesc}>
          {t('gdpr.contact.desc')} <a href={`mailto:${t('gdpr.contact.email')}`}>{t('gdpr.contact.email')}</a>
          {t('gdpr.contact.descSuffix')}
        </p>
      </section>
    </div>
  );
}
