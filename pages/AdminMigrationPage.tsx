import React from 'react';
import { MigrationTool } from '../components/admin/MigrationTool';

interface ErrorBoundaryState {
    hasError: boolean;
    error: any;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Migration Page Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-8 bg-red-50 text-red-900">
                    <div className="max-w-2xl w-full">
                        <h1 className="text-xl font-bold mb-4">Something went wrong</h1>
                        <pre className="bg-white p-4 rounded border border-red-200 overflow-auto font-mono text-sm shadow-sm">
                            {this.state.error?.toString()}
                            {this.state.error?.stack && `\n\n${this.state.error.stack}`}
                        </pre>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export const AdminMigrationPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <ErrorBoundary>
                <MigrationTool />
            </ErrorBoundary>
        </div>
    );
};
