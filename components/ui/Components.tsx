import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', ...props }: any) => {
  const baseStyle = "px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95";
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30",
    secondary: "bg-white text-secondary-800 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm",
    danger: "bg-danger text-white hover:bg-red-600 shadow-lg shadow-danger/20",
    success: "bg-success text-white hover:bg-green-600 shadow-lg shadow-success/20",
    outline: "border-2 border-primary-100 text-primary-600 hover:bg-primary-50 bg-transparent"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-2xl shadow-soft border border-gray-100/50 p-6 backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, type = 'default' }: any) => {
  const styles = {
    default: "bg-secondary-100 text-secondary-600 border border-secondary-200",
    success: "bg-green-50 text-green-700 border border-green-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    danger: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
    incomplete: "bg-orange-50 text-orange-700 border border-orange-200"
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${styles[type as keyof typeof styles]}`}>
      {children}
    </span>
  );
};

export const Input = ({ label, ...props }: any) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>}
    <input className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 outline-none transition-all duration-200 placeholder-gray-400" {...props} />
  </div>
);

export const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
