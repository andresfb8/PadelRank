import React, { useState, useMemo } from 'react';
import { X, Shield, Settings, History, Save, Zap, AlertCircle, Calendar, User as UserIcon, Plus, Trash2, Building, Mail } from 'lucide-react';
import { Button, Badge } from '../ui/Components';
import { User, Ranking, Player } from '../../types';
import { SUBSCRIPTION_PLANS, getPlanBadgeColor } from '../../config/subscriptionPlans';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    rankings: Ranking[];
    players: Record<string, Player>;
    onUpdate: (userId: string, data: Partial<User>) => Promise<void>;
    onDelete: (userId: string) => Promise<void>;
    onImpersonate: (userId: string) => void;
    currentUser: User | undefined;
}

export const ClientSidePanel = ({ 
    isOpen, 
    onClose, 
    user, 
    rankings, 
    players, 
    onUpdate, 
    onImpersonate,
    currentUser
}: Props) => {
    const [activeTab, setActiveTab] = useState<'general' | 'plan' | 'history'>('general');
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [suspensionReason, setSuspensionReason] = useState(user.suspensionReason || '');
    const [isSuspended, setIsSuspended] = useState(user.isSuspended || false);
    const [customMaxPlayers, setCustomMaxPlayers] = useState(user.customMaxPlayers || '');
    const [customMaxRankings, setCustomMaxRankings] = useState(user.customMaxRankings || '');
    const [selectedPlan, setSelectedPlan] = useState(user.plan || 'pro');
    const [stripeCouponId, setStripeCouponId] = useState(user.stripeCouponId || '');
    const [trialDays, setTrialDays] = useState(user.trialDays || '');
    const [newNote, setNewNote] = useState('');

    const userRankings = useMemo(() => rankings.filter(r => r.ownerId === user.id), [rankings, user.id]);

    const handleSaveGeneral = async () => {
        setIsSaving(true);
        try {
            await onUpdate(user.id, { 
                isSuspended, 
                suspensionReason: isSuspended ? suspensionReason : '' 
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePlan = async () => {
        setIsSaving(true);
        try {
            await onUpdate(user.id, { 
                plan: selectedPlan as any,
                customMaxPlayers: customMaxPlayers === '' ? undefined : Number(customMaxPlayers),
                customMaxRankings: customMaxRankings === '' ? undefined : Number(customMaxRankings),
                stripeCouponId: stripeCouponId === '' ? undefined : stripeCouponId,
                trialDays: trialDays === '' ? undefined : Number(trialDays)
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        
        const note = {
            id: Date.now().toString(),
            content: newNote.trim(),
            author: currentUser?.name || 'SuperAdmin',
            date: new Date().toISOString()
        };

        const updatedNotes = [...(user.internalNotes || []), note];
        await onUpdate(user.id, { internalNotes: updatedNotes });
        setNewNote('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            {/* Panel */}
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">{user.name}</h2>
                            <p className="text-xs text-gray-500 font-medium">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 pt-2 bg-gray-50/50 border-b border-gray-100">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                            activeTab === 'general' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        General
                    </button>
                    <button 
                        onClick={() => setActiveTab('plan')}
                        className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                            activeTab === 'plan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Planes
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                            activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Bitácora
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {/* Stats Preview */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Torneos</p>
                                    <p className="text-xl font-black text-gray-900">{userRankings.length}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado</p>
                                    <Badge type={isSuspended ? 'danger' : 'success'}>
                                        {isSuspended ? 'Suspendido' : 'Activo'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Suspension Zone */}
                            <div className={`p-6 rounded-3xl border transition-all ${isSuspended ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Shield className={isSuspended ? 'text-red-500' : 'text-gray-400'} size={20} />
                                        <h3 className={`font-bold ${isSuspended ? 'text-red-900' : 'text-gray-900'}`}>Estado de la Cuenta</h3>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={isSuspended}
                                            onChange={(e) => setIsSuspended(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                    </label>
                                </div>

                                {isSuspended && (
                                    <div className="space-y-3 animate-in zoom-in-95 duration-200">
                                        <p className="text-xs text-red-700 font-medium">Motivo de la suspensión (será visible para el usuario):</p>
                                        <textarea 
                                            value={suspensionReason}
                                            onChange={(e) => setSuspensionReason(e.target.value)}
                                            className="w-full p-3 rounded-xl border border-red-200 bg-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                            placeholder="Ej: Impago de cuota mensual..."
                                            rows={3}
                                        />
                                    </div>
                                )}
                                
                                <div className="mt-6">
                                    <Button 
                                        variant={isSuspended ? 'danger' : 'secondary'}
                                        onClick={handleSaveGeneral}
                                        loading={isSaving}
                                        className="w-full"
                                    >
                                        Guardar Estado
                                    </Button>
                                </div>
                            </div>

                            {/* Secondary Actions */}
                            <div className="space-y-4">
                                <Button 
                                    variant="outline" 
                                    className="w-full flex items-center justify-center gap-2"
                                    onClick={() => onImpersonate(user.id)}
                                >
                                    <Zap size={18} className="text-amber-500 fill-amber-500" />
                                    Suplantar Identidad
                                </Button>

                                <div className="pt-6 mt-6 border-t border-red-100">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Zona de Peligro</p>
                                    <Button 
                                        variant="danger" 
                                        className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-100"
                                        onClick={async () => {
                                            if (confirm(`¿ELIMINAR DEFINITIVAMENTE A ${user.name}? Esta acción borrará su acceso y todos sus datos en Firestore y Auth.`)) {
                                                setIsSaving(true);
                                                try {
                                                    await onDelete(user.id);
                                                    onClose();
                                                } finally {
                                                    setIsSaving(false);
                                                }
                                            }
                                        }}
                                        loading={isSaving}
                                    >
                                        <Trash2 size={18} />
                                        Eliminar Cliente permanentemente
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'plan' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {/* Plan Selector */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan de Suscripción</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedPlan(key)}
                                            className={`p-4 rounded-2xl border text-left transition-all ${
                                                selectedPlan === key 
                                                ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50' 
                                                : 'border-gray-100 hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-gray-900">{plan.name}</span>
                                                {selectedPlan === key && <Badge type="success">Seleccionado</Badge>}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Límites: {plan.maxPlayers === Infinity ? '∞' : plan.maxPlayers} jug. / {plan.maxRankings === Infinity ? '∞' : plan.maxRankings} torn.
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Overrides */}
                            <div className="space-y-4 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Settings size={18} className="text-indigo-600" />
                                    <h3 className="font-bold text-gray-900">Límites Personalizados</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Max. Jugadores</label>
                                        <input 
                                            type="number" 
                                            value={customMaxPlayers}
                                            onChange={(e) => setCustomMaxPlayers(e.target.value)}
                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white outline-none"
                                            placeholder="Auto"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Max. Torneos</label>
                                        <input 
                                            type="number" 
                                            value={customMaxRankings}
                                            onChange={(e) => setCustomMaxRankings(e.target.value)}
                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white outline-none"
                                            placeholder="Auto"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 leading-tight italic">
                                    * Deja vacío para usar los límites por defecto del plan seleccionado.
                                </p>
                            </div>

                            {/* Stripe Overrides */}
                            <div className="space-y-4 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <ExternalLink size={18} className="text-blue-600" />
                                    <h3 className="font-bold text-gray-900">Configuración Stripe</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stripe Coupon ID</label>
                                        <input 
                                            type="text" 
                                            value={stripeCouponId}
                                            onChange={(e) => setStripeCouponId(e.target.value)}
                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white outline-none"
                                            placeholder="Ej: PROMO50"
                                        />
                                        <p className="text-[10px] text-gray-400">Cupón que se aplicará automáticamente en el checkout.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Días de Trial (Prueba)</label>
                                        <input 
                                            type="number" 
                                            value={trialDays}
                                            onChange={(e) => setTrialDays(e.target.value)}
                                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white outline-none"
                                            placeholder="Por defecto del plan"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button 
                                variant="primary"
                                onClick={handleSavePlan}
                                loading={isSaving}
                                className="w-full"
                            >
                                <Save size={18} className="mr-2" />
                                Guardar Configuración
                            </Button>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-8 animate-in fade-in duration-300 h-full flex flex-col">
                            {/* Add Note */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nueva Anotación</label>
                                <div className="relative">
                                    <textarea 
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        className="w-full p-4 pr-12 rounded-2xl border border-gray-100 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="Escribe algo sobre este club..."
                                        rows={3}
                                    />
                                    <button 
                                        onClick={handleAddNote}
                                        className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-6">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Actividad Reciente</label>
                                <div className="relative space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-50">
                                    {(!user.internalNotes || user.internalNotes.length === 0) ? (
                                        <div className="py-12 text-center text-gray-300">
                                            <History size={48} className="mx-auto mb-3 opacity-20" />
                                            <p className="text-sm italic">Sin registros previos</p>
                                        </div>
                                    ) : (
                                        [...(user.internalNotes || [])].reverse().map((note) => (
                                            <div key={note.id} className="relative pl-8 group">
                                                <div className="absolute left-0 top-1 w-6 h-6 bg-white border-2 border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 z-10 group-hover:border-indigo-300 transition-colors">
                                                    <UserIcon size={12} className="fill-indigo-50" />
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm group-hover:border-indigo-100 transition-all">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-black text-gray-900">{note.author}</span>
                                                        <span className="text-[10px] text-gray-400 font-bold">{new Date(note.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <span>ID: {user.id}</span>
                    <span>Stripe: {user.stripeCustomerId || 'No vinculado'}</span>
                </div>
            </div>
        </div>
    );
};
