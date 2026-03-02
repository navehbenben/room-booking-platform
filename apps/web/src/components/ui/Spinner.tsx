import React from 'react';

interface SpinnerProps {
  size?: number;
}

export const Spinner = React.memo(function Spinner({ size = 16 }: SpinnerProps) {
  // Circumference of r=9 circle ≈ 56.549; dashoffset 25% creates a 3/4 arc
  return (
    <svg
      className="spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="56.549"
        strokeDashoffset="14.137"
      />
    </svg>
  );
});
