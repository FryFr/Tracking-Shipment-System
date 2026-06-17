import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Package, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchRecentSearches, type SearchEntry } from '../hooks/useSearchHistory';

export const HistoryView = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<SearchEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchRecentSearches(user.uid).then(setItems).finally(() => setLoading(false));
    }, [user]);

    return (
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6" /> Historial
            </h1>
            {loading ? (
                <p className="text-white/40">Cargando…</p>
            ) : items.length === 0 ? (
                <p className="text-white/40">Todavía no hay búsquedas.</p>
            ) : (
                <div className="space-y-2">
                    {items.map((e, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(`/search?q=${encodeURIComponent(e.query)}`)}
                            className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-left transition-colors"
                        >
                            {e.type === 'order'
                                ? <Package className="w-4 h-4 text-amber-400" />
                                : <SearchIcon className="w-4 h-4 text-blue-400" />}
                            <span className="font-mono text-white">{e.query}</span>
                            <span className="text-white/40 text-xs ml-auto">{e.result_count} envío(s)</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
