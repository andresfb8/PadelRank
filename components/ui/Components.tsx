import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', ...props }: any) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-primary text-white hover:bg-blue-600 shadow-md",
    secondary: "bg-secondary text-gray-700 hover:bg-gray-200",
    danger: "bg-red-500 text-white hover:bg-red-600",
    success: "bg-green-500 text-white hover:bg-green-600",
    outline: "border border-gray-300 text-gray-600 hover:bg-gray-50"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, type = 'default' }: any) => {
  const styles = {
    default: "bg-gray-100 text-gray-600",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    incomplete: "bg-orange-100 text-orange-800"
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[type as keyof typeof styles]}`}>
      {children}
    </span>
  );
};

export const Input = ({ label, ...props }: any) => (
  <div className="mb-3">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" {...props} />
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
