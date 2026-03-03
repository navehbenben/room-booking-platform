import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';
import styles from './RegisterPage.module.scss';

type RegisterPageProps = {
  onRegister: (name: string, email: string, password: string) => Promise<void>;
};

export function RegisterPage({ onRegister }: RegisterPageProps) {
  const navigate = useNavigate();

  const handleSuccess = async (name: string, email: string, password: string) => {
    await onRegister(name, email, password);
    navigate('/search');
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.form}>
        <div className={styles.logo}>
          Room<span>Book</span>
        </div>
        <GoogleAuthButton />
        <div className="auth-divider">
          <span>or register with email</span>
        </div>
        <RegisterForm onSuccess={handleSuccess} />
        <p className="auth-form__footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
