// Deep-links a la página de seguimiento del courier.
// Enfoque "email-first": la app no consulta una API de tracking paga; muestra
// el último estado conocido (de los correos) + este botón para ver la posición
// en vivo de un click en la web del courier. Cero dependencias, cero costo.

/** Normaliza el slug del courier (TrackingMore-style) a una clave estable. */
const normalizeSlug = (raw: string): string =>
    String(raw ?? '')
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-');

/** slug normalizado → función que arma la URL de tracking del courier. */
const URL_BUILDERS: Record<string, (tn: string) => string> = {
    dhl: (tn) => `https://www.dhl.com/en/express/tracking.html?AWB=${tn}&brand=DHL`,
    'dhl-express': (tn) => `https://www.dhl.com/en/express/tracking.html?AWB=${tn}&brand=DHL`,
    fedex: (tn) => `https://www.fedex.com/fedextrack/?trknbr=${tn}`,
    ups: (tn) => `https://www.ups.com/track?loc=en_US&tracknum=${tn}`,
    usps: (tn) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${tn}`,
    purolator: (tn) => `https://www.purolator.com/en/shipping/tracker?pin=${tn}`,
    canadapost: (tn) => `https://www.canadapost-postescanada.ca/track-reperage/en#/details/${tn}`,
    canpar: (tn) => `https://www.canpar.com/en/track/TrackingAction.do?reference=${tn}`,
    'gls-canada': (tn) => `https://gls-group.com/CA/en/parcel-tracking?match=${tn}`,
    dicom: (tn) => `https://gls-group.com/CA/en/parcel-tracking?match=${tn}`,
    tnt: (tn) => `https://www.tnt.com/express/en_us/site/shipping-tools/tracking.html?searchType=con&cons=${tn}`,
    'loomis-express': (tn) => `https://www.loomisexpress.com/tracking?trackingNumber=${tn}`,
};

/** Fallback universal: parcelsapp autodetecta el courier desde el número. */
const fallbackUrl = (tn: string): string => `https://parcelsapp.com/en/tracking/${encodeURIComponent(tn)}`;

export interface CourierLink {
    url: string;
    /** true si es la web oficial del courier; false si es el fallback genérico */
    official: boolean;
}

/**
 * Devuelve el deep-link de tracking para un envío. Si no se reconoce el courier,
 * cae al fallback universal (parcelsapp) que autodetecta por el número.
 */
export const getCourierLink = (courierSlug: string | undefined, trackingNumber: string): CourierLink | null => {
    const tn = String(trackingNumber ?? '').trim();
    if (!tn) return null;
    const builder = URL_BUILDERS[normalizeSlug(courierSlug || '')];
    return builder
        ? { url: builder(tn), official: true }
        : { url: fallbackUrl(tn), official: false };
};
