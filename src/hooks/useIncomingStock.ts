import { useEffect, useState } from 'react';
import type { IncomingLine } from '../types/incomingStock';

// Carga el snapshot de stock entrante (public/incoming-stock.json). Se baja solo
// al abrir la vista, así no infla el bundle principal de la app.
export const useIncomingStock = () => {
    const [items, setItems] = useState<IncomingLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(`${import.meta.env.BASE_URL}incoming-stock.json`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error('fetch failed'))))
            .then((data: IncomingLine[]) => { if (!cancelled) setItems(data); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    return { items, loading, error };
};
