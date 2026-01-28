import { FileText, Download } from 'lucide-react';
import { User } from '../../types';

interface BillingHistoryProps {
    user: User;
}

// Mock invoice data (will be real Stripe data in future)
const MOCK_INVOICES = [
    // { id: 'inv_001', date: '2026-01-01', amount: 29.99, status: 'paid' },
    // { id: 'inv_002', date: '2025-12-01', amount: 29.99, status: 'paid' },
];

export const BillingHistory = ({ user }: BillingHistoryProps) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <FileText className="text-primary" size={20} />
                Historial de Facturas
            </h3>

            {MOCK_INVOICES.length > 0 ? (
                <div className="space-y-3">
                    {MOCK_INVOICES.map((invoice) => (
                        <div
                            key={invoice.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {new Date(invoice.date).toLocaleDateString('es-ES', {
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                                <p className="text-xs text-gray-500">€{invoice.amount.toFixed(2)}</p>
                            </div>
                            <button className="p-2 hover:bg-white rounded-lg transition-colors">
                                <Download size={16} className="text-gray-600" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="text-gray-400" size={28} />
                    </div>
                    <p className="text-gray-500 text-sm">
                        No hay facturas disponibles
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                        Las facturas aparecerán aquí cuando se active la facturación
                    </p>
                </div>
            )}
        </div>
    );
};
