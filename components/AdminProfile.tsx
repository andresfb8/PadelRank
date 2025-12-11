import React from 'react';
import { User, Shield, Mail, Building } from 'lucide-react';
import { Card, Button } from './ui/Components';

interface Props {
  onClose: () => void;
}

export const AdminProfile = ({ onClose }: Props) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
        <div className="bg-primary/10 p-8 flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold mb-4 border-4 border-white shadow-lg">
                SA
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Admin Usuario</h2>
            <div className="flex items-center gap-1 mt-1 text-primary font-semibold">
                <Shield size={16} /> Super Admin
            </div>
        </div>
        <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Mail className="text-gray-400" />
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Email</p>
                    <p className="text-gray-900 font-medium">superadmin@padelrank.pro</p>
                </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Building className="text-gray-400" />
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Club Principal</p>
                    <p className="text-gray-900 font-medium">Club Central Pádel</p>
                </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Permisos de Sistema</h3>
                <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Gestión Total</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Crear Admins</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Ver Todo</span>
                </div>
            </div>

            <Button variant="secondary" onClick={onClose} className="w-full mt-4">Cerrar</Button>
        </div>
    </div>
  );
};
