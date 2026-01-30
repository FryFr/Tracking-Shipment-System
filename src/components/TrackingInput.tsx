import { Search } from 'lucide-react';
import { useState } from 'react';

interface Props {
    onSearch: (trackingNumber: string) => void;
    loading: boolean;
}

export const TrackingInput = ({ onSearch, loading }: Props) => {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onSearch(value.trim());
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-12 px-4 z-10 relative">
            <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight shadow-black drop-shadow-lg">
                    Track your shipment
                </h1>
                <p className="text-lg text-white/80">
                    Enter your tracking number to get real-time updates
                </p>
            </div>

            <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="h-6 w-6 text-gray-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Enter tracking number (e.g., 3543264550)"
                    className="block w-full pl-14 pr-36 py-5 bg-white/95 backdrop-blur-md border border-white/20 focus:border-primary/50 rounded-2xl text-lg shadow-2xl focus:shadow-primary/20 focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-gray-900"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !value.trim()}
                    className="absolute right-2.5 top-2.5 bottom-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-8 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/30 active:scale-95 flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Tracking...</span>
                        </>
                    ) : (
                        'Track'
                    )}
                </button>
            </form>
        </div>
    );
};
