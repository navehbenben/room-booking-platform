import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../hooks/useProfile';
import { friendlyError } from '../utils/errorMessages';

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
    <div className="profile-page">
      <div className="profile-hero profile-skeleton" style={{ height: 160 }} />
      <div className="profile-grid" style={{ marginTop: 24 }}>
        <div className="profile-card">
          <div className="profile-skeleton" style={{ height: 20, width: '60%', marginBottom: 16, borderRadius: 4 }} />
          <div className="profile-skeleton" style={{ height: 40, marginBottom: 12, borderRadius: 4 }} />
          <div className="profile-skeleton" style={{ height: 40, marginBottom: 20, borderRadius: 4 }} />
          <div className="profile-skeleton" style={{ height: 36, width: 120, borderRadius: 4 }} />
        </div>
        <div className="profile-card">
          <div className="profile-skeleton" style={{ height: 20, width: '50%', marginBottom: 16, borderRadius: 4 }} />
          <div className="profile-skeleton" style={{ height: 40, marginBottom: 12, borderRadius: 4 }} />
          <div className="profile-skeleton" style={{ height: 40, marginBottom: 12, borderRadius: 4 }} />
          <div className="profile-skeleton" style={{ height: 36, width: 140, borderRadius: 4 }} />
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
      <div className="profile-page">
        <p className="gdpr-error">{error ?? t('profile.failedToLoad')}</p>
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
    <div className="profile-page">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="profile-hero">
        <div className="profile-hero__avatar" style={{ backgroundColor: bg }}>
          {initials}
        </div>
        <div className="profile-hero__info">
          <div className="profile-hero__name">{profile.name ?? profile.email}</div>
          <div className="profile-hero__email">{profile.email}</div>
          <div className="profile-hero__since">
            {t('profile.memberSince', { date: formatMemberSince(profile.createdAt, i18n.language) })}
          </div>
        </div>
      </div>

      {/* ── Two-column grid ──────────────────────────────────────── */}
      <div className="profile-grid">
        {/* Profile Settings card */}
        <div className="profile-card">
          <h3 className="profile-card__title">{t('profile.profileSettings')}</h3>

          {/* Full name field */}
          <div className="profile-field">
            <span className="profile-field__label">{t('profile.fullName')}</span>
            {editingName ? (
              <div className="profile-edit-inline">
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
                <div className="profile-edit-inline__actions">
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
                  <p className="gdpr-error" style={{ marginTop: 6 }}>
                    {nameError}
                  </p>
                )}
              </div>
            ) : (
              <div className="profile-field__value">
                <span>{profile.name ?? <em style={{ color: 'var(--c-muted)' }}>{t('profile.noNameSet')}</em>}</span>
                {nameSuccess && <span className="profile-success-badge">{t('profile.savedBadge')}</span>}
                <button
                  className="profile-edit-btn"
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
          <div className="profile-field">
            <span className="profile-field__label">{t('profile.email')}</span>
            <div className="profile-field__value profile-field__locked">
              <span>{profile.email}</span>
              <span className="profile-field__lock-icon" title={t('profile.emailLocked')}>
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
        <div className="profile-card">
          <h3 className="profile-card__title">{t('profile.security')}</h3>

          {profile.hasPassword ? (
            <form onSubmit={handleChangePassword}>
              <div className="profile-field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <label className="profile-field__label" htmlFor="current-pwd">
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
                className="profile-field"
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 12 }}
              >
                <label className="profile-field__label" htmlFor="new-pwd">
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
                <p className="gdpr-error" style={{ marginTop: 8 }}>
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
            <p className="profile-field__label" style={{ marginBottom: 8 }}>
              {t('profile.connectedAccounts')}
            </p>
            <div className="connected-account">
              <span className="connected-account__icon">G</span>
              <span>Google</span>
              {profile.hasGoogleAccount ? (
                <span className="connected-account__status connected-account__status--on">
                  {t('profile.googleConnected')}
                </span>
              ) : (
                <span className="connected-account__status connected-account__status--off">
                  {t('profile.googleNotConnected')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Privacy link card ────────────────────────────────────── */}
      <div className="profile-privacy-card">
        <Link to="/privacy" className="profile-privacy-card__link">
          {t('profile.privacyLink')}
        </Link>
      </div>
    </div>
  );
}
