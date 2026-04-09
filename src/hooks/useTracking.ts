import { useState } from 'react';
import type { TrackingData } from '../types/tracking';

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL
    || 'https://jssilvam1.app.n8n.cloud/webhook/b1ddc9f9-0229-4fd5-a261-3c8721149abb';

export const useTracking = () => {
    const [data, setData] = useState<TrackingData[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const trackShipment = async (trackingInput: string) => {
        setLoading(true);
        setError(null);
        setData(null);

        try {
            // Split by comma and clean up whitespace
            const trackingNumbers = trackingInput.split(',').map(t => t.trim()).filter(t => t.length > 0);

            if (trackingNumbers.length === 0) {
                setLoading(false);
                return;
            }

            // Create an array of promises for concurrent fetching
            const promises = trackingNumbers.map(async (tn) => {
                try {
                    const response = await fetch(WEBHOOK_URL, {
                        method: 'POST',
                        body: JSON.stringify([{ tracking_number: tn }]), // Send as array of 1 object
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (!response.ok) return null;

                    const result = await response.json();

                    // Handle response: N8N returns an array or single object
                    if (Array.isArray(result) && result.length > 0) {
                        return result[0];
                    } else if (result && !Array.isArray(result) && (result as any).tracking_number) {
                        return result as TrackingData;
                    }
                    return null;
                } catch (e) {
                    console.error(`Failed to fetch ${tn}`, e);
                    return null;
                }
            });

            // Wait for all to complete
            const results = await Promise.all(promises);

            // Filter out nulls and normalize fields for n8n response compat
            const validData = results
                .filter((item): item is TrackingData => item !== null)
                .map((item) => {
                    const raw = item as any;
                    return {
                        ...item,
                        carrier_info: item.carrier_info ?? { slug: item.courier_slug },
                        // n8n returns raw_checkpoints_data, app expects raw_checkpoints
                        raw_checkpoints: item.raw_checkpoints ?? raw.raw_checkpoints_data ?? [],
                        // n8n returns last_event_date, app expects last_update
                        last_update: item.last_update ?? raw.last_event_date ?? '',
                        // Normalize status_detail from n8n
                        status_detail: item.status_detail || raw.status || 'Unknown',
                    };
                });

            if (validData.length > 0) {
                setData(validData);
            } else {
                setError('Tracking details not found for any of the provided numbers.');
            }

        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred while processing your request.');
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, trackShipment };
};
