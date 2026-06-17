import { useState } from 'react';
import type { TrackingData } from '../types/tracking';
import { fetchTrackingDoc, queryTrackingsByOrder, placeholderTracking } from './useTrackingStore';

// Email-first: la búsqueda lee el store de Firestore (alimentado por n8n desde
// los correos). No hay llamada a una API de tracking en vivo; el estado al minuto
// se ve con el deep-link al courier dentro de la tarjeta.

export const useTracking = () => {
    const [data, setData] = useState<TrackingData[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /** Buscar por uno o varios números de tracking (separados por coma). */
    const trackShipment = async (trackingInput: string) => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            const tns = trackingInput.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
            if (tns.length === 0) {
                setLoading(false);
                return;
            }
            // Doc guardado o placeholder (igual muestra el deep-link al courier)
            const results = await Promise.all(
                tns.map(async (tn) => (await fetchTrackingDoc(tn).catch(() => null)) ?? placeholderTracking(tn)),
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
