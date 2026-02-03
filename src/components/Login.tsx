import React from 'react';
import { LogIn } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
    loading: boolean;
    error: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, loading, error }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#1a1a1a] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                {/* Decorative Background Elements */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700" />

                <div className="relative z-10 text-center">
                    <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 p-[2px]">
                        <div className="w-full h-full bg-[#0a0a0a] rounded-[14px] flex items-center justify-center">
                            <LogIn className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        Tracking System
                    </h1>
                    <p className="text-gray-400 mb-8">
                        Please sign in with your <span className="text-blue-400 font-semibold">@dynaproco.com</span> account to access the platform.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm animate-in fade-in slide-in-from-top-4">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={onLogin}
                        disabled={loading}
                        className="w-full py-4 px-6 bg-white text-[#0a0a0a] font-bold rounded-2xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] rounded-full animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                    />
                                </svg>
                                Sign in with Google
                            </>
                        )}
                    </button>
                </div>
            </div>

            <footer className="mt-8 text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} Dynapro Logistics. All rights reserved.
            </footer>
        </div>
    );
};

export default Login;
