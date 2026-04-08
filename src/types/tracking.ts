export interface Coordinate {
    latitude: number;
    longitude: number;
}

export interface CheckpointEvent {
    code: string;
    reason: string | null;
}

export interface Checkpoint {
    checkpoint_time: string;
    city: string | null;
    coordinate: Coordinate | null;
    country_region: string | null;
    country_region_name: string | null;
    created_at: string;
    events: CheckpointEvent[];
    location: string | null;
    message: string;
    postal_code: string | null;
    raw_tag: string | null;
    slug: string;
    source: string;
    state: string | null;
    subtag: string;
    subtag_message: string;
    tag: string;
}

export interface OrderReferences {
    purchase_order?: string;
    sales_order?: string;
    order_confirmation?: string;
}

export interface CarrierInfo {
    slug: string;
    name?: string;
    phone?: string;
    website?: string;
}

export interface ShipmentGrouping {
    order_id?: string;
    shipment_index?: number;
    shipment_total?: number;
}

export interface LogisticsETA {
    customs_weeks?: number;
    deconsolidation_weeks?: number;
    import_weeks?: number;
    total_additional_weeks?: number;
    estimated_arrival?: string;
    port_of_entry?: string;
    notes?: string;
    updated_by?: string;
    updated_at?: string;
    reviewed?: boolean;
}

export interface TrackingData {
    tracking_number: string;
    courier_slug: string;
    status: string;
    status_detail: string;
    last_location: string;
    last_update: string;
    eta: string;
    raw_checkpoints: Checkpoint[];
    order_references?: OrderReferences;
    carrier_info?: CarrierInfo;
    shipment_grouping?: ShipmentGrouping;
    logistics_eta?: LogisticsETA;
    data_source?: 'api' | 'email';
}
