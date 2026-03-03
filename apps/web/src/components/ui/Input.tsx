import React, { forwardRef } from 'react';
import styles from './Input.module.scss';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    const groupClasses = [styles.group, error && styles.groupError, className].filter(Boolean).join(' ');
    return (
      <div className={groupClasses}>
        <label className={styles.label}>
          <span className={styles.labelText}>{label}</span>
          <input ref={ref} className={styles.input} {...props} />
        </label>
        {error && <span className={styles.inputError}>{error}</span>}
        {hint && !error && <span className={styles.hint}>{hint}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
