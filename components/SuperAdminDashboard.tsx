import React, { useState } from 'react';
import { Button, Card, Input, Modal, Badge } from './ui/Components';
import { User, Ranking, Player } from '../types';
import {
    Building,
    Users,
    Trophy,
    Edit,
    Trash2,
    Plus,
    Search,
    ChevronRight,
    Crown,
    Calendar,
    Zap
} from 'lucide-react';
import { SUBSCRIPTION_PLANS, getPlanBadgeColor } from '../config/subscriptionPlans';

interface Props {
    users: User[];
    rankings: Ranking[];
    players: Record<string, Player>;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onDelete: (id: string) => void;
    onCreate: (userData: { name: string; email: string; clubName: string; password?: string }) => void;
    onUpdatePlan: (userId: string, plan: 'basic' | 'pro' | 'star' | 'weekend' | 'trial') => void;
    onUpdateUser: (userData: Partial<User> & { id: string }) => void;
    onResetPassword: (email: string) => void;
    onViewClient: (userId: string) => void;
    onClearDB?: () => void;
}

export const SuperAdminDashboard = ({
    users,
    rankings,
    players,
    onApprove,
    onReject,
    onDelete,
    onCreate,
    onUpdatePlan,
    onUpdateUser,
    onResetPassword,
    onViewClient,
    onClearDB
}: Props) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', clubName: '', password: '' });
    const [tempInternalNotes, setTempInternalNotes] = useState('');

    // Filter active admins (exclude superadmin and pending users)
    const activeAdmins = users.filter(u =>
        u.role === 'admin' &&
        (u.status === 'active' || u.status === 'blocked')
    );

    const pendingUsers = users.filter(u => u.status === 'pending');

    // Search filter
    const filteredAdmins = activeAdmins.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.clubName && user.clubName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Revenue Calculation
    const totalRevenue = activeAdmins.reduce((acc, user) => {
        const plan = (user.plan || 'pro') as keyof typeof SUBSCRIPTION_PLANS;
        return acc + (SUBSCRIPTION_PLANS[plan]?.price || 0);
    }, 0);

    // Pagination
    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const totalPages = Math.ceil(filteredAdmins.length / ITEMS_PER_PAGE);
    const paginatedAdmins = filteredAdmins.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Calculate stats for each admin
    const getAdminStats = (userId: string) => {
        const userRankings = rankings.filter(r => r.ownerId === userId);
        const activeTournaments = userRankings.filter(r => r.status === 'activo').length;
        const totalTournaments = userRankings.length;
        const userPlayers = Object.values(players).filter(p => p.ownerId === userId).length;

        return {
            activeTournaments,
            totalTournaments,
            totalPlayers: userPlayers
        };
    };

    const handleCreateSubmit = () => {
        if (!newAdmin.name || !newAdmin.email || !newAdmin.clubName) {
            return alert("Todos los campos son obligatorios");
        }
        onCreate(newAdmin);
        setIsCreateModalOpen(false);
        setNewAdmin({ name: '', email: '', clubName: '', password: '' });
    };

    const handlePlanUpdate = (plan: 'basic' | 'pro' | 'star' | 'weekend' | 'trial') => {
        if (selectedUser) {
            onUpdatePlan(selectedUser.id, plan);
            setIsPlanModalOpen(false);
            setSelectedUser(null);
        }
    };

    const handleNotesSave = () => {
        if (selectedUser) {
            onUpdateUser({ id: selectedUser.id, internalNotes: tempInternalNotes });
            setIsNotesModalOpen(false);
            setSelectedUser(null);
        }
    };

    const formatActivity = (dateStr?: string) => {
        if (!dateStr) return 'Nunca';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Crown className="text-yellow-500" size={28} />
                        Panel SuperAdmin
                    </h1>
                    <p className="text-gray-500 mt-1">Gestión de clientes y suscripciones</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
                        <Plus size={18} /> Nuevo Cliente
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Clientes Activos</p>
                            <h3 className="text-3xl font-bold text-gray-900">{activeAdmins.length}</h3>
                        </div>
                        <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <Building size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ingresos Estimados</p>
                            <h3 className="text-3xl font-bold text-gray-900">{totalRevenue}€<span className="text-sm font-normal text-gray-400">/mes</span></h3>
                        </div>
                        <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                            <span className="text-2xl font-bold">€</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Torneos</p>
                            <h3 className="text-3xl font-bold text-gray-900">{rankings.length}</h3>
                        </div>
                        <div className="h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                            <Trophy size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Jugadores</p>
                            <h3 className="text-3xl font-bold text-gray-900">{Object.keys(players).length}</h3>
                        </div>
                        <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                            <Users size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                    placeholder="Buscar por nombre, email o club..."
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Clients Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-left text-sm font-medium text-gray-500 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4 text-center">Torneos</th>
                                <th className="px-6 py-4 text-center">Jugadores</th>
                                <th className="px-6 py-4 text-center">Actividad</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedAdmins.map(user => {
                                const stats = getAdminStats(user.id);
                                const plan = user.plan || 'pro'; // Default to pro
                                const planInfo = SUBSCRIPTION_PLANS[plan];

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-bold text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                                <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                    <Building size={12} />
                                                    {user.clubName || 'Sin club'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPlanBadgeColor(plan)}`}>
                                                {planInfo.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm">
                                                <span className="font-bold text-gray-900">{stats.activeTournaments}</span>
                                                <span className="text-gray-400"> / {stats.totalTournaments}</span>
                                            </div>
                                            <div className="text-xs text-gray-400">activos / total</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm font-bold text-gray-900">{stats.totalPlayers}</div>
                                            <div className="text-xs text-gray-400">
                                                {planInfo.maxPlayers === Infinity ? '∞' : `/ ${planInfo.maxPlayers}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm font-medium text-gray-900">{formatActivity(user.lastLogin)}</div>
                                            <div className="text-[10px] text-gray-400">Último acceso</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge type={user.status === 'active' ? 'success' : 'danger'}>
                                                {user.status === 'active' ? 'Activo' : 'Bloqueado'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setTempInternalNotes(user.internalNotes || '');
                                                        setIsNotesModalOpen(true);
                                                    }}
                                                    className={`p-2 rounded-lg transition-colors ${user.internalNotes ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                    title="Notas Internas"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsPlanModalOpen(true);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Gestionar Plan"
                                                >
                                                    <div className="h-[18px] w-[18px] flex items-center justify-center font-bold text-[10px]">€</div>
                                                </button>
                                                <button
                                                    onClick={() => onViewClient(user.id)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Ver Dashboard"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`¿Enviar correo de reseteo a ${user.email}?`)) {
                                                            onResetPassword(user.email);
                                                        }
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <Zap size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`¿Eliminar a ${user.name}?`)) {
                                                            onDelete(user.id);
                                                        }
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar Cliente"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredAdmins.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron clientes.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100">
                            <span className="text-sm text-gray-500">
                                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredAdmins.length)} de {filteredAdmins.length} clientes
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="text-sm py-1"
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="text-sm py-1"
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Pending Requests Section */}
            {pendingUsers.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-orange-900 mb-4">Solicitudes Pendientes</h3>
                    <div className="space-y-3">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="bg-white p-4 rounded-lg flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-gray-900">{user.name}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => onApprove(user.id)} className="bg-green-600 hover:bg-green-700">
                                        Aprobar
                                    </Button>
                                    <Button variant="danger" onClick={() => onReject(user.id)}>
                                        Rechazar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Admin Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Crear Nuevo Cliente">
                <div className="space-y-4">
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                        <p className="text-sm text-blue-800">
                            <strong>📧 Activación automática:</strong> Se enviará un correo al cliente con un enlace para que cree su propia contraseña de forma segura.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateSubmit}>Crear Cliente</Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Plan Modal */}
            <Modal
                isOpen={isPlanModalOpen}
                onClose={() => {
                    setIsPlanModalOpen(false);
                    setSelectedUser(null);
                }}
                title={`Editar Plan: ${selectedUser?.name}`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Selecciona el nuevo plan de suscripción:</p>

                    {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                        <button
                            key={key}
                            onClick={() => handlePlanUpdate(key as any)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:border-indigo-300 hover:shadow-md ${selectedUser?.plan === key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-900">{plan.name}</h4>
                                <span className="text-lg font-bold text-indigo-600">{plan.price}€/mes</span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                                <div>• {plan.maxPlayers === Infinity ? 'Jugadores ilimitados' : `Hasta ${plan.maxPlayers} jugadores`}</div>
                                <div>• {plan.maxActiveTournaments === Infinity ? 'Torneos ilimitados' : `Hasta ${plan.maxActiveTournaments} torneos activos`}</div>
                                <div>• {plan.allowedFormats.length} formatos disponibles</div>
                            </div>
                        </button>
                    ))}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="secondary" onClick={() => {
                            setIsPlanModalOpen(false);
                            setSelectedUser(null);
                        }}>
                            Cancelar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Internal Notes Modal */}
            <Modal
                isOpen={isNotesModalOpen}
                onClose={() => {
                    setIsNotesModalOpen(false);
                    setSelectedUser(null);
                }}
                title={`Notas Internas: ${selectedUser?.name}`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Estas notas son privadas y solo visibles para el SuperAdmin.
                    </p>
                    <textarea
                        className="w-full h-40 p-4 border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                        placeholder="Ej: Cliente preferente, necesita ayuda con torneos americanos..."
                        value={tempInternalNotes}
                        onChange={(e) => setTempInternalNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="secondary" onClick={() => {
                            setIsNotesModalOpen(false);
                            setSelectedUser(null);
                        }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleNotesSave}>
                            Guardar Notas
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
