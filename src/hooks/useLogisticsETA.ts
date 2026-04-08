import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { LogisticsETA } from '../types/tracking';

const COLLECTION = 'logistics_eta';

export const fetchETA = async (trackingNumber: string): Promise<LogisticsETA | null> => {
    const ref = doc(db, COLLECTION, trackingNumber);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as LogisticsETA;
};

export const saveETA = async (
    trackingNumber: string,
    data: Partial<LogisticsETA>,
    userEmail: string,
): Promise<void> => {
    const ref = doc(db, COLLECTION, trackingNumber);

    const totalWeeks =
        (data.customs_weeks ?? 0) +
        (data.deconsolidation_weeks ?? 0) +
        (data.import_weeks ?? 0);

    await setDoc(ref, {
        ...data,
        total_additional_weeks: totalWeeks,
        updated_by: userEmail,
        updated_at: new Date().toISOString(),
    }, { merge: true });
};
