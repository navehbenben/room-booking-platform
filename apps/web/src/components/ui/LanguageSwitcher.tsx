import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
] as const;

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentCode = LANGUAGES.find((l) => i18n.language.startsWith(l.code))?.code ?? 'en';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div className="lang-switcher" ref={ref}>
      <button
        className="lang-switcher__btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('languageSwitcher.ariaLabel')}
        aria-expanded={open}
        type="button"
      >
        🌐
      </button>
      {open && (
        <div className="lang-switcher__dropdown" role="listbox">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              role="option"
              aria-selected={code === currentCode}
              className={`lang-switcher__option${code === currentCode ? ' lang-switcher__option--active' : ''}`}
              onClick={() => {
                i18n.changeLanguage(code);
                setOpen(false);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
