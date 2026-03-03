import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { friendlyError, errorCode } from '../../utils/errorMessages';

type LoginFormProps = {
  onSuccess: (email: string, password: string) => Promise<void>;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setFormError('');
  };

  const submit = async () => {
    clearErrors();
    setLoading(true);
    try {
      await onSuccess(email, password);
    } catch (e) {
      const code = errorCode(e);
      const msg = friendlyError(e);

      if (code === 'INVALID_CREDENTIALS') {
        setPasswordError(msg);
      } else if (code === 'GOOGLE_ACCOUNT_ONLY') {
        setEmailError(msg);
      } else {
        setFormError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email && password) submit();
  };

  const isGoogleOnly = emailError.includes('Google');

  return (
    <>
      <h2 className="auth-form__title">{t('auth.login.title')}</h2>
      <p className="auth-form__subtitle">{t('auth.login.subtitle')}</p>

      <div className="auth-form__fields">
        <div className="auth-form__field-group">
          <Input
            label={t('auth.login.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('auth.login.emailPlaceholder')}
            autoComplete="email"
            error={emailError}
          />
          {emailError && !isGoogleOnly && (
            <p className="auth-form__field-hint">
              {t('auth.login.newHere')}{' '}
              <Link to="/register" className="auth-form__inline-link">
                {t('auth.login.createAccount')}
              </Link>
            </p>
          )}
        </div>

        <div className="auth-form__field-group">
          <Input
            label={t('auth.login.passwordLabel')}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('auth.login.passwordPlaceholder')}
            autoComplete="current-password"
            error={passwordError}
          />
        </div>
      </div>

      {formError && <div className="form-error">{formError}</div>}

      <Button
        variant="primary"
        onClick={submit}
        disabled={!email || !password}
        loading={loading}
        className="auth-form__submit"
      >
        {t('auth.login.submitBtn')}
      </Button>
    </>
  );
}
