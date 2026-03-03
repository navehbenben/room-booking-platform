import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
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

      <Input
        label={t('checkoutForm.name')}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
        }}
        placeholder={t('checkoutForm.namePlaceholder')}
        autoComplete="name"
        error={errors.name}
      />

      <Input
        label={t('checkoutForm.email')}
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
        }}
        placeholder={t('checkoutForm.emailPlaceholder')}
        autoComplete="email"
        error={errors.email}
      />

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="checkout-notes">
          {t('checkoutForm.notes')}
        </label>
        <textarea
          id="checkout-notes"
          className={styles.textarea}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('checkoutForm.notesPlaceholder')}
          maxLength={500}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        disabled={loading || disabled}
        className={styles.submitBtn}
      >
        {t('checkoutForm.confirmBtn')}
      </Button>
    </form>
  );
});
