import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface SearchEntry {
    query: string;
    type: 'tracking' | 'order';
    result_count: number;
    ts: string;
}

/** Registra una búsqueda en el historial del usuario (best-effort). */
export const recordSearch = async (uid: string, entry: Omit<SearchEntry, 'ts'>): Promise<void> => {
    try {
        await addDoc(collection(db, 'users', uid, 'searches'), { ...entry, ts: new Date().toISOString() });
    } catch { /* best-effort, no bloquear la búsqueda */ }
};

/** Búsquedas recientes del usuario, deduplicadas (más nuevas primero, máx 30). */
export const fetchRecentSearches = async (uid: string): Promise<SearchEntry[]> => {
    const q = query(collection(db, 'users', uid, 'searches'), orderBy('ts', 'desc'), limit(50));
    const snap = await getDocs(q);
    const seen = new Set<string>();
    const out: SearchEntry[] = [];
    for (const d of snap.docs) {
        const e = d.data() as SearchEntry;
        const k = `${e.type}:${(e.query || '').toUpperCase()}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(e);
        if (out.length >= 30) break;
    }
    return out;
};
