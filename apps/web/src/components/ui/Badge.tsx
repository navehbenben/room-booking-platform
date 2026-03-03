import React from 'react';
import styles from './Badge.module.scss';

type BadgeVariant = 'success' | 'warning' | 'cancelled' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge = React.memo(function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const classes = [styles.badge, styles[variant], className].filter(Boolean).join(' ');
  return <span className={classes} data-variant={variant}>{children}</span>;
});
