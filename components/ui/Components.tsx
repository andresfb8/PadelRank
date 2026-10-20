import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Shared building blocks, in the app's style: one court blue on the main action, flat surfaces,
// a quiet 1px edge instead of shadows, sentence case. Call sites may still add classes.

export const Button = ({ children, onClick, variant = 'primary', className = '', ...props }: any) => {
  const baseStyle = "rg h-10 px-4 rounded-md text-[14px] font-semibold transition-colors duration-150 inline-flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-court text-white hover:bg-[#174CB0]",
    secondary: "bg-white text-rg-ink border border-rg-control hover:bg-rg-raised",
    danger: "bg-rg-negative text-white hover:bg-[#a51d22]",
    success: "bg-rg-positive text-white hover:bg-[#1d6541]",
    outline: "bg-white text-court border border-court-track hover:bg-court-soft",
    ghost: "bg-transparent text-rg-ink hover:bg-rg-raised",
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant as keyof typeof variants] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', noPadding = false }: any) => (
  <div className={`rg bg-white rounded-lg border border-rg-line ${noPadding ? '' : 'p-5'} ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, type = 'default', className = '', ...props }: any) => {
  // Pale tint with the dark ink of the same hue
  const styles = {
    default: "bg-rg-raised text-[#374151]",
    neutral: "bg-rg-raised text-[#374151]",
    success: "bg-[#dcfce7] text-[#14532d]",
    warning: "bg-[#fffbeb] text-[#92400e]",
    danger: "bg-[#ffedea] text-[#831c1e]",
    info: "bg-court-soft text-court-ink",
    incomplete: "bg-[#fff1e6] text-[#7a3a10]",
  };
  return (
    <span className={`rg inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[12px] font-medium whitespace-nowrap ${styles[type as keyof typeof styles] || styles.default} ${className}`} {...props}>
      {children}
    </span>
  );
};

export const Input = ({ label, id, ...props }: any) => {
  const inputId = id || (label ? `input-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);
  return (
    <div className="rg mb-4">
      {label && <label htmlFor={inputId} className="block text-[13px] font-medium text-rg-ink mb-1.5">{label}</label>}
      <input id={inputId} className="w-full h-10 px-3 bg-white border border-rg-control rounded-md text-[15px] text-rg-ink placeholder:text-rg-muted focus:outline-none focus:border-court focus:ring-2 focus:ring-court-track transition-colors" {...props} />
    </div>
  );
};

/** A dialog: a sheet from the bottom on phones, centred from the tablet up. Escape closes it; a click outside does not, so a half-filled form is never lost. */
export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: any) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="rg fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#0F1729]/40 sm:p-4 animate-fade-in">
      <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className={`bg-white rounded-t-xl sm:rounded-xl shadow-[0_12px_40px_rgba(15,23,41,0.2)] w-full ${maxWidth} max-h-[92vh] sm:max-h-[90vh] overflow-y-auto`}>
        <div className="px-5 h-14 border-b border-rg-line flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-[16px] font-semibold truncate">{title}</h2>
          <button type="button" onClick={onClose} className="w-9 h-9 -mr-2 rounded-md grid place-items-center text-rg-muted hover:text-rg-ink hover:bg-rg-raised transition-colors" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
};
