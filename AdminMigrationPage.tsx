import React from 'react';
import { MigrationTool } from './components/admin/MigrationTool';
import { useAuth } from './hooks/useAuth';

/**
 * Temporary Admin Migration Page
 * DELETE THIS FILE AFTER MIGRATION IS COMPLETE
 */
export const AdminMigrationPage: React.FC = () => {
    const { user } = useAuth();

    // Only allow superadmins
    if (!user || user.role !== 'superadmin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    <p className="text-gray-600">
                        This page is only accessible to SuperAdmins.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <div className="text-red-600 text-2xl">⚠️</div>
                        <div>
                            <h2 className="font-bold text-red-900 mb-2">TEMPORARY ADMIN TOOL</h2>
                            <p className="text-red-700 text-sm">
                                This page should be deleted after migration is complete.
                                Do not deploy this to production!
                            </p>
                        </div>
                    </div>
                </div>

                <MigrationTool />
            </div>
        </div>
    );
};
