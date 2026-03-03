import React from 'react';
import { Spinner } from './Spinner';
import styles from './Button.module.scss';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export const Button = React.memo(function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const classes = [styles.btn, styles[variant], styles[size], className].filter(Boolean).join(' ');
  return (
    <button className={classes} data-variant={variant} disabled={disabled || loading} {...props}>
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : children}
    </button>
  );
});
