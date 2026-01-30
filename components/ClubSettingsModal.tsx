import React, { useState } from 'react';
import { X, Save, Building2, ImageIcon, Upload, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { User, Ranking } from '../types';
import { processLogoUpload } from '../utils/imageProcessor';
import { updateUser, updateRanking } from '../services/db';
import { Modal, Button } from './ui/Components';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    rankings: Ranking[]; // To allow propagation
    onUpdateUser?: (updatedUser: User) => void;
}

export const ClubSettingsModal = ({ isOpen, onClose, user, rankings, onUpdateUser }: Props) => {
    const [logoUrl, setLogoUrl] = useState<string | undefined>(user.branding?.logoUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [propagateToRankings, setPropagateToRankings] = useState(false);

    // Reset state when opening/closing or user changing
    React.useEffect(() => {
        if (isOpen) {
            setLogoUrl(user.branding?.logoUrl);
            setPropagateToRankings(false);
        }
    }, [isOpen, user]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const base64 = await processLogoUpload(file);
            setLogoUrl(base64);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user.id) return;
        setIsSaving(true);
        try {
            // 1. Update User Profile
            const updatedUser = {
                ...user,
                branding: {
                    ...user.branding,
                    logoUrl: logoUrl
                }
            };

            // Call DB update
            await updateUser(updatedUser);

            // Notify parent if needed (though subscription should handle it)
            if (onUpdateUser) onUpdateUser(updatedUser);

            // 2. Propagate to Rankings if checked
            if (propagateToRankings && logoUrl) {
                const userRankings = rankings.filter(r => r.ownerId === user.id);

                // Execute in parallel promises
                const updates = userRankings.map(r => {
                    const updatedRanking = {
                        ...r,
                        config: {
                            ...r.config,
                            branding: {
                                ...r.config?.branding,
                                logoUrl: logoUrl
                            }
                        }
                    };
                    return updateRanking(updatedRanking);
                });

                await Promise.all(updates);
                alert(`Logo actualizado en perfil y aplicado a ${updates.length} torneos activos.`);
            }

            onClose();
        } catch (error) {
            console.error("Error saving club settings:", error);
            alert("Error al guardar la configuración.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configuración de Club / Organización" size="lg">
            <div className="space-y-6">
                {/* Intro Box */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                    <Building2 className="text-blue-600 mt-1 shrink-0" size={24} />
                    <div>
                        <h3 className="font-bold text-blue-900">Identidad Corporativa</h3>
                        <p className="text-sm text-blue-700">
                            Configura el logo de tu organización aquí. Podrás aplicarlo automáticamente a todos tus torneos presentes y futuros.
                        </p>
                    </div>
                </div>

                {/* Logo Uploader */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ImageIcon size={18} className="text-gray-500" /> Logo Predeterminado
                    </h4>

                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Preview */}
                        <div className="shrink-0">
                            <div className="w-40 h-40 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                                {logoUrl ? (
                                    <>
                                        <img src={logoUrl} alt="Club Logo" className="w-full h-full object-contain p-2" />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setLogoUrl(undefined)}
                                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                title="Eliminar logo"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-gray-400 p-4">
                                        <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                                        <span className="text-xs">Sin logo</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Subir Logo del Club</label>
                                <div className="flex items-center gap-3">
                                    <label className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isUploading ? <Upload size={16} className="animate-bounce" /> : <Upload size={16} />}
                                        {isUploading ? 'Procesando...' : 'Seleccionar Archivo'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleLogoUpload}
                                            disabled={isUploading}
                                        />
                                    </label>
                                    <span className="text-xs text-gray-500">Máx 10MB. Formato PNG/JPG.</span>
                                </div>
                            </div>

                            {/* Propagation Option */}
                            {logoUrl && logoUrl !== user.branding?.logoUrl && (
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                            checked={propagateToRankings}
                                            onChange={(e) => setPropagateToRankings(e.target.checked)}
                                        />
                                        <div className="text-sm">
                                            <span className="font-bold text-yellow-800">Actualizar torneos existentes</span>
                                            <p className="text-yellow-700 text-xs mt-0.5">
                                                Si marcas esto, el nuevo logo se aplicará inmediatamente a tus {rankings.filter(r => r.ownerId === user.id).length} torneos activos, reemplazando cualquier logo anterior.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSave} disabled={isSaving || isUploading} icon={<Save size={18} />}>
                        {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
