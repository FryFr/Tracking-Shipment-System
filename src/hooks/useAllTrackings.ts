import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { TrackingData } from '../types/tracking';
import { mapTrackingDoc } from './useTrackingStore';

/** Suscripción en vivo a toda la colección `trackings`. */
export const useAllTrackings = () => {
    const [items, setItems] = useState<TrackingData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, 'trackings'),
            (snap) => {
                setItems(snap.docs.map((d) => mapTrackingDoc(d.data(), d.id)));
                setLoading(false);
            },
            () => setLoading(false),
        );
        return unsub;
    }, []);

    return { items, loading };
};
