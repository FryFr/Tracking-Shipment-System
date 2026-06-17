import { useState } from 'react';
import type { TrackingData } from '../types/tracking';
import { fetchTrackingDoc, queryTrackingsByOrder, placeholderTracking, requestRefresh, saveStubTracking } from './useTrackingStore';

// Lee el store de Firestore (alimentado por correos + 17track). Si un número no
// está, dispara un lookup on-demand a 17track (auto-detecta el courier), espera
// y reintenta — así se puede buscar cualquier tracking, no solo los de correos.

/** ¿El doc trae data real, o es un placeholder/stub/NotFound que conviene re-consultar? */
const hasRealData = (t: TrackingData | null): boolean => {
    if (!t || t.data_source === undefined) return false;
    const sd = (t.status_detail || '').toLowerCase();
    if (sd === '' || sd === 'no tracking data yet' || sd.includes('registrado')) return false;
    if (sd === 'notfound' || sd.includes('not found') || sd === 'no tracking data found') return false;
    if ((t.status || '').toLowerCase() === 'notfound') return false;
    return true;
};

export const useTracking = () => {
    const [data, setData] = useState<TrackingData[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /** Buscar por uno o varios números de tracking (separados por coma). courier opcional
     * (slug) para el lookup on-demand cuando 17track no auto-detecta. */
    const trackShipment = async (trackingInput: string, courier?: string) => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const tns = trackingInput.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
            if (tns.length === 0) {
                setLoading(false);
                return;
            }
            const results = await Promise.all(
                tns.map(async (tn) => {
                    let doc = await fetchTrackingDoc(tn).catch(() => null);
                    // Si no está en el store (o no tiene data real), pedir lookup on-demand
                    // a 17track (auto-detecta el courier), esperar y reintentar.
                    if (!hasRealData(doc)) {
                        await requestRefresh(tn, courier ?? '').catch(() => {});
                        // 17track registra y trae data async; reintentamos unas veces.
                        for (let i = 0; i < 3 && !hasRealData(doc); i++) {
                            await new Promise((r) => setTimeout(r, 5000));
                            const retry = await fetchTrackingDoc(tn).catch(() => null);
                            if (hasRealData(retry)) doc = retry;
                        }
                        // Sigue sin data (17track aún no la trajo) pero tenemos courier:
                        // dejamos un stub para que el Sync horario lo complete solo.
                        if (!hasRealData(doc) && courier) await saveStubTracking(tn, courier);
                    }
                    return doc ?? placeholderTracking(tn);
                }),
            );
            setData(results);
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred while processing your request.');
        } finally {
            setLoading(false);
        }
    };

    /** Buscar por orden (SO/PO/OC): trae todos los envíos vinculados. */
    const trackByOrder = async (orderRef: string) => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const results = await queryTrackingsByOrder(orderRef);
            if (results.length === 0) {
                setError(`No shipments found for ${orderRef.toUpperCase()} yet. Track a shipment and link it, or wait for the shipping notification email.`);
                return;
            }
            setData(results);
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred while processing your request.');
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, trackShipment, trackByOrder };
};
