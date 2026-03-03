import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';
import styles from './LoginPage.module.scss';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/search';

  const handleSuccess = async (email: string, password: string) => {
    await onLogin(email, password);
    navigate(redirect, { replace: true });
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.form}>
        <div className={styles.logo}>
          Room<span>Book</span>
        </div>
        <GoogleAuthButton />
        <div className="auth-divider">
          <span>or sign in with email</span>
        </div>
        <LoginForm onSuccess={handleSuccess} />
        <p className="auth-form__footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
