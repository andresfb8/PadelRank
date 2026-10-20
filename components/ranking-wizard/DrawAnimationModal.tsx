import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, SkipForward, X } from 'lucide-react';

export interface DrawGroup {
    label: string;
    pairs: { p1Name: string; p2Name: string }[];
}

interface Props {
    isOpen: boolean;
    groups: DrawGroup[];
    onComplete?: () => void;
    onClose: () => void;
    autoCloseOnComplete?: boolean;
}

const GROUP_REVEAL_MS = 300;
const CARDS_REVEAL_MS = 500;
const INTER_GROUP_PAUSE_MS = 450;

export const DrawAnimationModal = ({
    isOpen,
    groups,
    onComplete,
    onClose,
    autoCloseOnComplete = false,
}: Props) => {
    const [revealedGroups, setRevealedGroups] = useState(0);
    const [showCardsForGroup, setShowCardsForGroup] = useState<number[]>([]);
    const [finished, setFinished] = useState(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;

    const clearTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };

    useEffect(() => {
        if (!isOpen) return;
        setRevealedGroups(0);
        setShowCardsForGroup([]);
        setFinished(false);
        clearTimers();

        let cursor = 0;
        groups.forEach((_, gIdx) => {
            // Reveal group title
            timersRef.current.push(setTimeout(() => {
                setRevealedGroups(gIdx + 1);
            }, cursor));
            cursor += GROUP_REVEAL_MS;
            // Reveal all cards of this group
            timersRef.current.push(setTimeout(() => {
                setShowCardsForGroup(prev => [...prev, gIdx]);
            }, cursor));
            cursor += CARDS_REVEAL_MS + INTER_GROUP_PAUSE_MS;
        });
        // Finished
        timersRef.current.push(setTimeout(() => {
            setFinished(true);
            onCompleteRef.current?.();
            if (autoCloseOnComplete) {
                timersRef.current.push(setTimeout(() => onClose(), 400));
            }
        }, cursor));

        return clearTimers;
    }, [isOpen, groups, autoCloseOnComplete, onClose]);

    const handleSkip = () => {
        clearTimers();
        setRevealedGroups(groups.length);
        setShowCardsForGroup(groups.map((_, i) => i));
        setFinished(true);
        onCompleteRef.current?.();
        if (autoCloseOnComplete) {
            timersRef.current.push(setTimeout(() => onClose(), 300));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="rg fixed inset-0 z-[60] flex items-center justify-center bg-[#0F1729]/70 p-4">
            <div className="bg-rg-night rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                <div className="px-5 h-14 flex justify-between items-center sticky top-0 bg-rg-night z-10 border-b border-white/10">
                    <h3 className="text-[16px] font-semibold text-white flex items-center gap-2">
                        <Trophy className="text-[#7FA6EE]" size={18} />
                        Sorteo de Grupos
                    </h3>
                    <div className="flex items-center gap-2">
                        {!finished && (
                            <button
                                onClick={handleSkip}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition flex items-center gap-1"
                            >
                                <SkipForward size={14} /> Saltar
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"
                            aria-label="Cerrar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {groups.map((group, gIdx) => {
                        const titleVisible = gIdx < revealedGroups;
                        const cardsVisible = showCardsForGroup.includes(gIdx);
                        return (
                            <AnimatePresence key={gIdx}>
                                {titleVisible && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="bg-white/5 rounded-lg p-4"
                                    >
                                        <motion.h4
                                            initial={{ scale: 0.9 }}
                                            animate={{ scale: 1 }}
                                            className="text-[16px] font-semibold text-white mb-3"
                                        >
                                            {group.label}
                                        </motion.h4>
                                        <div className="grid sm:grid-cols-2 gap-2">
                                            {group.pairs.map((pair, pIdx) => (
                                                <motion.div
                                                    key={pIdx}
                                                    initial={{ opacity: 0, y: -100, rotate: -8 }}
                                                    animate={cardsVisible ? { opacity: 1, y: 0, rotate: 0 } : {}}
                                                    transition={{
                                                        duration: 0.4,
                                                        delay: pIdx * 0.06,
                                                        type: 'spring',
                                                        stiffness: 180,
                                                        damping: 14,
                                                    }}
                                                    className="bg-white rounded-md p-3"
                                                >
                                                    <div className="text-xs font-bold text-gray-400 mb-1">Pareja {pIdx + 1}</div>
                                                    <div className="text-sm font-bold text-gray-900 truncate">
                                                        {pair.p1Name || <span className="text-gray-300">—</span>}
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-900 truncate">
                                                        {pair.p2Name || <span className="text-gray-300">—</span>}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        );
                    })}

                    {finished && !autoCloseOnComplete && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-center pt-2"
                        >
                            <button
                                onClick={onClose}
                                className="h-10 px-5 rounded-md font-semibold bg-court text-white hover:bg-[#174CB0] transition-colors"
                            >
                                Cerrar
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};
