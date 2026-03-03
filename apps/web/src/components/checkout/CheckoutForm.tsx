import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import styles from './CheckoutForm.module.scss';

interface FormErrors {
  name?: string;
  email?: string;
}

interface CheckoutFormProps {
  onConfirm: (notes?: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export const CheckoutForm = React.memo(function CheckoutForm({
  onConfirm,
  loading,
  disabled = false,
}: CheckoutFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = t('checkoutForm.nameRequired');
    if (!email.trim()) errs.email = t('checkoutForm.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = t('checkoutForm.emailInvalid');
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onConfirm(notes || undefined);
  };

  return (
    <form className={styles.wrap} onSubmit={handleSubmit}>
      <h3 className={styles.title}>{t('checkoutForm.title')}</h3>
      <div className={`input-group${errors.name ? ' input-group--error' : ''}`}>
        <label className="input-label">
          <span className="input-label__text">{t('checkoutForm.name')}</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('checkoutForm.namePlaceholder')}
          />
        </label>
        {errors.name && <span className="input-error">{errors.name}</span>}
      </div>
      <div className={`input-group${errors.email ? ' input-group--error' : ''}`}>
        <label className="input-label">
          <span className="input-label__text">{t('checkoutForm.email')}</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('checkoutForm.emailPlaceholder')}
          />
        </label>
        {errors.email && <span className="input-error">{errors.email}</span>}
      </div>
      <div className="input-group">
        <label className="input-label">
          <span className="input-label__text">{t('checkoutForm.notes')}</span>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('checkoutForm.notesPlaceholder')}
            maxLength={500}
          />
        </label>
      </div>
      <Button type="submit" variant="primary" loading={loading} disabled={loading || disabled}>
        {t('checkoutForm.confirmBtn')}
      </Button>
    </form>
  );
});
