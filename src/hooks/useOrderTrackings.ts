import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import type { OrderReferences } from '../types/tracking';

const ORDER_COLLECTION = 'order_trackings';
const METADATA_COLLECTION = 'tracking_metadata';

/** Fetch all tracking numbers linked to an order reference */
export const fetchTrackingsByOrder = async (orderId: string): Promise<string[]> => {
    const ref = doc(db, ORDER_COLLECTION, orderId.toUpperCase());
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    return (snap.data().tracking_numbers as string[]) || [];
};

/** Fetch order references stored for a tracking number */
export const fetchOrderRefs = async (trackingNumber: string): Promise<OrderReferences | null> => {
    const ref = doc(db, METADATA_COLLECTION, trackingNumber);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        purchase_order: data.purchase_order,
        sales_order: data.sales_order,
        order_confirmation: data.order_confirmation,
    };
};

/** Link a tracking number to order references (writes both directions) */
export const saveOrderLink = async (
    trackingNumber: string,
    refs: OrderReferences,
    userEmail: string,
): Promise<void> => {
    const now = new Date().toISOString();

    // Write tracking_metadata/{trackingNumber} with the order refs
    const metaRef = doc(db, METADATA_COLLECTION, trackingNumber);
    await setDoc(metaRef, {
        ...refs,
        updated_by: userEmail,
        updated_at: now,
    }, { merge: true });

    // Write order_trackings/{orderId} for each non-empty reference (reverse lookup)
    const entries: [string, string][] = [
        [refs.sales_order ?? '', 'sales_order'],
        [refs.purchase_order ?? '', 'purchase_order'],
        [refs.order_confirmation ?? '', 'order_confirmation'],
    ];

    for (const [orderId, orderType] of entries) {
        if (!orderId) continue;
        const orderRef = doc(db, ORDER_COLLECTION, orderId.toUpperCase());
        await setDoc(orderRef, {
            tracking_numbers: arrayUnion(trackingNumber),
            order_type: orderType,
            updated_by: userEmail,
            updated_at: now,
        }, { merge: true });
    }
};

/** Detect if input looks like an order reference rather than a tracking number */
export const isOrderReference = (input: string): boolean => {
    const upper = input.trim().toUpperCase();
    return /^(SO|PO|OC)\d+/.test(upper);
};
