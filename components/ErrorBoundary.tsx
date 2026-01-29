import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error in TV Mode:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-900 text-white p-8 font-sans">
                    <h1 className="text-4xl font-bold text-red-500 mb-4">Algo salió mal</h1>
                    <p className="text-xl text-gray-300 mb-8 max-w-2xl text-center">Se produjo un error al cargar este componente. Intenta recargar la página.</p>
                    <div className="bg-black/50 p-6 rounded-lg font-mono text-sm text-red-400 overflow-auto max-w-4xl w-full border border-red-900/50">
                        <p className="font-bold mb-2">Detalles del error:</p>
                        <p>{this.state.error?.toString()}</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
                    >
                        Recargar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
