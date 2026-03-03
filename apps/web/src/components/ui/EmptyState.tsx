import React from 'react';
import styles from './EmptyState.module.scss';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export const EmptyState = React.memo(function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <div className={styles.title}>{title}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
    </div>
  );
});
