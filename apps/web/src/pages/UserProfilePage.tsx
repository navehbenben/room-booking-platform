import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../hooks/useProfile';
import { friendlyError } from '../utils/errorMessages';
import styles from './UserProfilePage.module.scss';

/** Deterministic avatar background from email — seeded HSL */
function avatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 38%)`;
}

function avatarInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

function formatMemberSince(iso: string, locale?: string): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function ProfileSkeleton() {
  return (
    <div className={styles.page}>
      <div className={`${styles.hero} ${styles.skeleton}`} style={{ height: 160 }} />
      <div className={styles.grid} style={{ marginTop: 24 }}>
        <div className={styles.card}>
          <div className={styles.skeleton} style={{ height: 20, width: '60%', marginBottom: 16, borderRadius: 4 }} />
          <div className={styles.skeleton} style={{ height: 40, marginBottom: 12, borderRadius: 4 }} />
          <div className={styles.skeleton} style={{ height: 40, marginBottom: 20, borderRadius: 4 }} />
          <div className={styles.skeleton} style={{ height: 36, width: 120, borderRadius: 4 }} />
        </div>
        <div className={styles.card}>
          <div className={styles.skeleton} style={{ height: 20, width: '50%', marginBottom: 16, borderRadius: 4 }} />
          <div className={styles.skeleton} style={{ height: 40, marginBottom: 12, borderRadius: 4 }} />
          <div className={styles.skeleton} style={{ height: 40, marginBottom: 12, borderRadius: 4 }} />
          <div className={styles.skeleton} style={{ height: 36, width: 140, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

export function UserProfilePage() {
  const { t, i18n } = useTranslation();
  const { profile, loading, error, saveName, savePassword } = useProfile();

  // Name edit state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Password form state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  if (loading) return <ProfileSkeleton />;
  if (error || !profile) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error ?? t('profile.failedToLoad')}</p>
      </div>
    );
  }

  const handleEditName = () => {
    setNameInput(profile.name ?? '');
    setNameSuccess(false);
    setNameError(null);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setNameSaving(true);
    setNameError(null);
    try {
      await saveName(nameInput.trim());
      setNameSuccess(true);
      setEditingName(false);
      setTimeout(() => setNameSuccess(false), 2500);
    } catch (err) {
      setNameError(friendlyError(err, t('profile.failedToSaveName')));
    } finally {
      setNameSaving(false);
    }
  };

  const handleCancelName = () => {
    setEditingName(false);
    setNameError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSaving(true);
    setPwdError(null);
    setPwdSuccess(false);
    try {
      await savePassword(currentPwd, newPwd);
      setPwdSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err) {
      setPwdError(friendlyError(err, t('profile.failedToChangePassword')));
    } finally {
      setPwdSaving(false);
    }
  };

  const bg = avatarColor(profile.email);
  const initials = avatarInitials(profile.name, profile.email);

  return (
    <div className={styles.page}>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroAvatar} style={{ backgroundColor: bg }}>
          {initials}
        </div>
        <div className={styles.heroInfo}>
          <div className={styles.heroName}>{profile.name ?? profile.email}</div>
          <div className={styles.heroEmail}>{profile.email}</div>
          <div className={styles.heroSince}>
            {t('profile.memberSince', { date: formatMemberSince(profile.createdAt, i18n.language) })}
          </div>
        </div>
      </div>

      {/* ── Two-column grid ──────────────────────────────────────── */}
      <div className={styles.grid}>
        {/* Profile Settings card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t('profile.profileSettings')}</h3>

          {/* Full name field */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t('profile.fullName')}</span>
            {editingName ? (
              <div className={styles.editInline}>
                <input
                  className="form-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                  disabled={nameSaving}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelName();
                  }}
                />
                <div className={styles.editInlineActions}>
                  <button
                    className="btn btn--primary"
                    onClick={handleSaveName}
                    disabled={nameSaving || !nameInput.trim()}
                  >
                    {nameSaving ? t('common.saving') : t('common.save')}
                  </button>
                  <button className="btn btn--ghost" onClick={handleCancelName} disabled={nameSaving}>
                    {t('common.cancel')}
                  </button>
                </div>
                {nameError && (
                  <p className={styles.error} style={{ marginTop: 6 }}>
                    {nameError}
                  </p>
                )}
              </div>
            ) : (
              <div className={styles.fieldValue}>
                <span>{profile.name ?? <em style={{ color: 'var(--c-muted)' }}>{t('profile.noNameSet')}</em>}</span>
                {nameSuccess && <span className={styles.successBadge}>{t('profile.savedBadge')}</span>}
                <button
                  className={styles.editBtn}
                  onClick={handleEditName}
                  title={t('profile.editNameAriaLabel')}
                  aria-label={t('profile.editNameAriaLabel')}
                >
                  ✎
                </button>
              </div>
            )}
          </div>

          {/* Email field — read-only */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>{t('profile.email')}</span>
            <div className={`${styles.fieldValue} ${styles.fieldLocked}`}>
              <span>{profile.email}</span>
              <span className={styles.fieldLockIcon} title={t('profile.emailLocked')}>
                🔒
              </span>
            </div>
          </div>

          {!editingName && (
            <button className="btn btn--secondary" onClick={handleEditName} style={{ marginTop: 8 }}>
              {t('profile.editProfile')}
            </button>
          )}
        </div>

        {/* Security card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t('profile.security')}</h3>

          {profile.hasPassword ? (
            <form onSubmit={handleChangePassword}>
              <div className={styles.field} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <label className={styles.fieldLabel} htmlFor="current-pwd">
                  {t('profile.currentPassword')}
                </label>
                <input
                  id="current-pwd"
                  type="password"
                  className="form-input"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  disabled={pwdSaving}
                  autoComplete="current-password"
                />
              </div>
              <div
                className={styles.field}
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 12 }}
              >
                <label className={styles.fieldLabel} htmlFor="new-pwd">
                  {t('profile.newPassword')}
                </label>
                <input
                  id="new-pwd"
                  type="password"
                  className="form-input"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  disabled={pwdSaving}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              {pwdError && (
                <p className={styles.error} style={{ marginTop: 8 }}>
                  {pwdError}
                </p>
              )}
              {pwdSuccess && (
                <p style={{ color: 'var(--c-success)', marginTop: 8, fontSize: 14 }}>
                  {t('profile.passwordChangedSuccess')}
                </p>
              )}
              <button
                type="submit"
                className="btn btn--primary"
                disabled={pwdSaving || !currentPwd || newPwd.length < 8}
                style={{ marginTop: 16 }}
              >
                {pwdSaving ? t('profile.changingPassword') : t('profile.changePasswordBtn')}
              </button>
            </form>
          ) : (
            <p style={{ color: 'var(--c-muted)', fontSize: 14, marginBottom: 16 }}>{t('profile.googleOnly')}</p>
          )}

          {/* Connected accounts */}
          <div style={{ marginTop: 20, borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
            <p className={styles.fieldLabel} style={{ marginBottom: 8 }}>
              {t('profile.connectedAccounts')}
            </p>
            <div className={styles.connectedAccount}>
              <span className={styles.connectedAccountIcon}>G</span>
              <span>Google</span>
              {profile.hasGoogleAccount ? (
                <span className={[styles.connectedAccountStatus, styles.on].join(' ')}>
                  {t('profile.googleConnected')}
                </span>
              ) : (
                <span className={[styles.connectedAccountStatus, styles.off].join(' ')}>
                  {t('profile.googleNotConnected')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Privacy link card ────────────────────────────────────── */}
      <div className={styles.privacyCard}>
        <Link to="/privacy" className={styles.privacyCardLink}>
          {t('profile.privacyLink')}
        </Link>
      </div>
    </div>
  );
}
