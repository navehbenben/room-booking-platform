import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    const groupClasses = ['input-group', error && 'input-group--error', className].filter(Boolean).join(' ');
    return (
      <div className={groupClasses}>
        <label className="input-label">
          <span className="input-label__text">{label}</span>
          <input ref={ref} className="input" {...props} />
        </label>
        {error && <span className="input-error">{error}</span>}
        {hint && !error && <span className="input-hint">{hint}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
