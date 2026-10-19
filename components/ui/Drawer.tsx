import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'full';
}

export const Drawer = ({ isOpen, onClose, children, title, size = 'lg' }: DrawerProps) => {
    // Lock body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        full: 'max-w-full'
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-[#0F1729]/40 z-40 animate-fade-in"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div
                className={`fixed right-0 top-0 bottom-0 ${sizeClasses[size]} w-full bg-rg-ground shadow-[0_12px_40px_rgba(15,23,41,0.2)] z-50 overflow-y-auto animate-slide-in-right rg`}
            >
                {/* Header */}
                {title && (
                    <div className="sticky top-0 bg-white border-b border-rg-line px-5 h-14 flex items-center justify-between z-10">
                        <p className="text-[15px] font-semibold">{title}</p>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 grid place-items-center rounded-md text-rg-muted hover:text-rg-ink hover:bg-rg-raised transition-colors" aria-label="Cerrar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-5">
                    {children}
                </div>
            </div>
        </>
    );
};
