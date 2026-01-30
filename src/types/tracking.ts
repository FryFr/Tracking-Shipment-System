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

export interface TrackingData {
    tracking_number: string;
    courier_slug: string;
    status: string;
    status_detail: string;
    last_location: string;
    last_update: string;
    eta: string;
    raw_checkpoints: Checkpoint[];
}
