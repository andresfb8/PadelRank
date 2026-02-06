import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', ...props }: any) => {
  const baseStyle = "px-5 py-2.5 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-95";
  const variants = {
    primary: "bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98]",
    secondary: "bg-white text-gray-700 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200",
    danger: "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600",
    success: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600",
    outline: "border-2 border-primary/20 text-primary hover:bg-primary-50 bg-transparent"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', noPadding = false }: any) => (
  <div className={`bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 ${noPadding ? '' : 'p-6'} ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, type = 'default', className = '' }: any) => {
  const styles = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    incomplete: "bg-orange-100 text-orange-800"
  };
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wide flex items-center gap-1 ${styles[type as keyof typeof styles]} ${className}`}>
      {children}
    </span>
  );
};

export const Input = ({ label, ...props }: any) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{label}</label>}
    <input className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-gray-900 placeholder-gray-400 transition-all font-medium" {...props} />
  </div>
);

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">&times;</button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
