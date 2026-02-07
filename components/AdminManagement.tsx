import React, { useState } from 'react';
import { Button, Card, Input, Modal, Badge } from './ui/Components';
import { User } from '../types';
import { Ban, Check, X, Trash2, Mail, Shield, Plus, Building, Lock, Unlock, CreditCard, Calendar, AlertCircle, ExternalLink } from 'lucide-react';

interface Props {
  users: User[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  onBlock?: (id: string) => void; // Optional for now to avoid breaking if parent not updated immediately
  onUnblock?: (id: string) => void;
  onCreate: (userData: { name: string; email: string; clubName: string; password?: string }) => void;
  onClearDB?: () => void;
}

export const AdminManagement = ({ users, onApprove, onReject, onDelete, onCreate, onClearDB }: Props) => {
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', clubName: '', password: '' });

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => (u.status === 'active' || u.status === 'blocked') && u.role !== 'superadmin');

  const handleCreateSubmit = () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.clubName || !newAdmin.password) return alert("Todos los campos son obligatorios");
    if (newAdmin.password.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");
    onCreate(newAdmin);
    setIsModalOpen(false);
    setNewAdmin({ name: '', email: '', clubName: '', password: '' });
  };

  return (
    <div className="space-y-6">
      {onClearDB && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-800 font-medium">
            <Shield size={20} />
            <span>Zona de Mantenimiento</span>
          </div>
          <Button variant="danger" onClick={onClearDB} className="text-xs">
            Borrar Jugadores/Torneos de Prueba
          </Button>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Administradores</h2>
          <p className="text-gray-500">Administra accesos y solicitudes de registro</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus size={18} /> Crear Admin
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'active' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('active')}
        >
          Administradores Activos ({activeUsers.length})
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'pending' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('pending')}
        >
          Solicitudes Pendientes ({pendingUsers.length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm font-medium text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Club/Escuela</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Próximo Cobro</th>
                <th className="px-6 py-4 text-center">Estado Pago</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(activeTab === 'active' ? activeUsers : pendingUsers).map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                    <Building size={14} className="text-gray-400" />
                    {user.clubName || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <Badge type={user.plan === 'star' ? 'success' : user.plan === 'pro' ? 'warning' : 'neutral'}>
                        {user.plan?.toUpperCase() || 'FREE'}
                      </Badge>
                      {user.isLegacyFree && <span className="text-[10px] text-gray-400 mt-1 italic">Legacy Free</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {user.planExpiry ? (
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(user.planExpiry).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.hasFailedPayment ? (
                      <div className="flex flex-col items-center">
                        <Badge type="danger" className="flex items-center gap-1">
                          <AlertCircle size={12} /> Pago Fallido
                        </Badge>
                        {user.lastPaymentError && <span className="text-[9px] text-red-500 mt-1 max-w-[120px] truncate" title={user.lastPaymentError}>{user.lastPaymentError}</span>}
                      </div>
                    ) : user.subscriptionStatus === 'active' ? (
                      <Badge type="success">Al día</Badge>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge type={user.status === 'active' ? 'success' : user.status === 'blocked' ? 'danger' : 'warning'}>
                      {user.status === 'active' ? 'Activo' : user.status === 'blocked' ? 'Bloqueado' : 'Pendiente'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {activeTab === 'pending' ? (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => onApprove(user.id)}
                          className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                          title="Aprobar Solicitud"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => onReject(user.id)}
                          className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
                          title="Rechazar Solicitud"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => onDelete(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Eliminar Administrador"
                        >
                          <Trash2 size={18} />
                        </button>
                        {user.stripeCustomerId && (
                          <a
                            href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 inline-flex"
                            title="Ver en Stripe"
                          >
                            <ExternalLink size={12} />
                            STRIPE
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {(activeTab === 'active' ? activeUsers : pendingUsers).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No hay {activeTab === 'active' ? 'administradores activos' : 'solicitudes pendientes'}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Crear Nuevo Administrador">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Se enviará un correo electrónico automático al usuario con las instrucciones de acceso.
          </p>
          <Input
            label="Nombre Completo"
            value={newAdmin.name}
            onChange={(e: any) => setNewAdmin({ ...newAdmin, name: e.target.value })}
            placeholder="Ej: Laura Pérez"
          />
          <Input
            label="Correo Electrónico"
            type="email"
            value={newAdmin.email}
            onChange={(e: any) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            placeholder="ej: laura@clubpadel.com"
          />
          <Input
            label="Nombre del Club/Escuela"
            value={newAdmin.clubName}
            onChange={(e: any) => setNewAdmin({ ...newAdmin, clubName: e.target.value })}
            placeholder="Ej: Padel Center Madrid"
          />

          <Input
            label="Clave de Acceso"
            type="text"
            value={newAdmin.password}
            onChange={(e: any) => setNewAdmin({ ...newAdmin, password: e.target.value })}
            placeholder="Mínimo 6 caracteres"
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSubmit} className="flex items-center gap-2">
              <Mail size={16} /> Crear Admin
            </Button>
          </div>
        </div>
      </Modal>
    </div >
  );
};