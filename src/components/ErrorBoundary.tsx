import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}
interface State {
    error: Error | null;
}

/**
 * Atrapa errores de render y los muestra en pantalla en vez de dejar la app
 * en blanco. Imprescindible para una herramienta que se consulta a diario.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Render error:', error, info);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
                    <div className="max-w-lg w-full bg-white/5 border border-red-500/30 rounded-2xl p-6 text-white">
                        <h1 className="text-lg font-bold text-red-400 mb-2">Something went wrong</h1>
                        <p className="text-sm text-white/70 mb-4">
                            The view crashed while rendering. Detail below — please share it:
                        </p>
                        <pre className="text-xs bg-black/40 rounded-lg p-3 overflow-auto max-h-60 text-red-300 whitespace-pre-wrap">
                            {this.state.error.message}
                            {'\n\n'}
                            {this.state.error.stack}
                        </pre>
                        <button
                            onClick={() => { this.setState({ error: null }); location.reload(); }}
                            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
