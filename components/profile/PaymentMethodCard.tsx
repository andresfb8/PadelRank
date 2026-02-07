import { CreditCard, Plus } from 'lucide-react';
import { User } from '../../types';
import { Button } from '../ui/Components';
import { createPortalSession } from '../../services/stripeService';

interface PaymentMethodCardProps {
    user: User;
}

export const PaymentMethodCard = ({ user }: PaymentMethodCardProps) => {
    // Mock payment method (will be real Stripe data in future)
    const hasPaymentMethod = false; // Change to true when Stripe is integrated

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <CreditCard className="text-primary" size={20} />
                Método de Pago
            </h3>

            {hasPaymentMethod ? (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 text-white">
                        <div className="flex justify-between items-start mb-8">
                            <div className="text-xs opacity-70">VISA</div>
                            <div className="text-xs opacity-70">Válida hasta 12/25</div>
                        </div>
                        <div className="text-lg tracking-wider mb-2">•••• •••• •••• 1234</div>
                        <div className="text-xs opacity-70">TITULAR DE LA TARJETA</div>
                    </div>
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={async () => {
                            try {
                                await createPortalSession();
                            } catch (err) {
                                alert("No se pudo abrir el portal de facturación.");
                            }
                        }}
                    >
                        Actualizar Tarjeta
                    </Button>
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="text-gray-400" size={28} />
                    </div>
                    <p className="text-gray-500 text-sm mb-4">
                        No hay método de pago configurado
                    </p>
                    {user.stripeCustomerId ? (
                        <Button
                            className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold"
                            onClick={async () => {
                                try {
                                    await createPortalSession();
                                } catch (err) {
                                    alert("No se pudo abrir el portal de facturación.");
                                }
                            }}
                        >
                            <Plus size={18} className="mr-2" />
                            Gestionar en Stripe
                        </Button>
                    ) : (
                        <div className="w-full bg-gray-50 rounded-xl p-3 text-center border border-dashed border-gray-200">
                            <p className="text-gray-400 text-xs italic">
                                Método de pago no gestionable por Stripe
                            </p>
                        </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-center gap-2">
                        <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Secured by</span>
                        <span className="text-blue-600 font-bold italic tracking-tighter text-sm">Stripe</span>
                    </div>
                </div>
            )}
        </div>
    );
};
