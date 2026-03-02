import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { friendlyError, errorCode } from '../../utils/errorMessages';

type RegisterFormProps = {
  onSuccess: (name: string, email: string, password: string) => Promise<void>;
};

function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; labelKey: string } {
  if (pw.length === 0) return { level: 0, labelKey: '' };
  if (pw.length < 8) return { level: 1, labelKey: 'auth.register.strength.tooShort' };
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (score >= 2) return { level: 3, labelKey: 'auth.register.strength.strong' };
  if (score === 1) return { level: 2, labelKey: 'auth.register.strength.fair' };
  return { level: 1, labelKey: 'auth.register.strength.weak' };
}

const STRENGTH_COLORS = ['', '#e53e3e', '#d69e2e', '#38a169'] as const;
const STRENGTH_CLASS = ['', 'weak', 'fair', 'strong'] as const;

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const strength = passwordStrength(password);

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setFormError('');
  };

  const submit = async () => {
    clearErrors();

    if (password.length < 8) {
      setPasswordError(t('auth.register.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      await onSuccess(name, email, password);
    } catch (e) {
      const code = errorCode(e);
      const msg = friendlyError(e);

      if (code === 'EMAIL_ALREADY_EXISTS') {
        setEmailError(msg);
      } else if (code === 'VALIDATION_ERROR') {
        setFormError(msg);
      } else {
        setFormError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email && password.length >= 8) submit();
  };

  return (
    <>
      <h2 className="auth-form__title">{t('auth.register.title')}</h2>
      <p className="auth-form__subtitle">{t('auth.register.subtitle')}</p>

      <div className="auth-form__fields">
        <Input
          label={t('auth.register.nameLabel')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('auth.register.namePlaceholder')}
          autoComplete="name"
        />

        <div className="auth-form__field-group">
          <Input
            label={t('auth.register.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('auth.register.emailPlaceholder')}
            autoComplete="email"
            error={emailError}
          />
          {emailError && (
            <p className="auth-form__field-hint">
              {t('auth.register.alreadyHaveAccount')}{' '}
              <Link to="/login" className="auth-form__inline-link">
                {t('auth.register.signIn')}
              </Link>
            </p>
          )}
        </div>

        <div className="auth-form__field-group">
          <Input
            label={t('auth.register.passwordLabel')}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('auth.register.passwordPlaceholder')}
            hint={t('auth.register.passwordHint')}
            autoComplete="new-password"
            error={passwordError}
          />
          {password.length > 0 && (
            <div className="password-strength">
              <div className="password-strength__bars">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={`password-strength__bar${strength.level >= level ? ` password-strength__bar--${STRENGTH_CLASS[strength.level]}` : ''}`}
                    style={{ backgroundColor: strength.level >= level ? STRENGTH_COLORS[strength.level] : undefined }}
                  />
                ))}
              </div>
              <span className="password-strength__label" style={{ color: STRENGTH_COLORS[strength.level] }}>
                {strength.labelKey ? t(strength.labelKey) : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {formError && <div className="form-error">{formError}</div>}

      <Button
        variant="primary"
        onClick={submit}
        disabled={!email || password.length < 8}
        loading={loading}
        className="auth-form__submit"
      >
        {t('auth.register.submitBtn')}
      </Button>
    </>
  );
}
