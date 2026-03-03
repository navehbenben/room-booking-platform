import React from 'react';
import styles from './SkeletonCard.module.scss';

export const SkeletonCard = React.memo(function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={`${styles.skeleton} ${styles.title}`} />
      <div className={`${styles.skeleton} ${styles.text}`} />
      <div className={`${styles.skeleton} ${styles.text} ${styles.short}`} />
      <div className={`${styles.skeleton} ${styles.button}`} />
    </div>
  );
});
