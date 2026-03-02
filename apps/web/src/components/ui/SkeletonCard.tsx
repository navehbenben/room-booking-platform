import React from 'react';

export const SkeletonCard = React.memo(function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--text" />
      <div className="skeleton skeleton--text skeleton--short" />
      <div className="skeleton skeleton--button" />
    </div>
  );
});
