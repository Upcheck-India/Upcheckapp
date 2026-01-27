export interface Profile {
    id: string;
    email: string | null;
    username: string | null;
    full_name: string | null;
    website: string | null;
    avatar_url: string | null;
    first_name?: string | null; // deprecated or sync with full_name if needed
    last_name?: string | null; // deprecated
    phone_number: string | null;
    language_preference: string;
    created_at: string;
}

export interface Farm {
    id: string;
    user_id: string;
    farm_code: string;
    name: string;
    area_hectares: number | null;
    address: string | null;
    longitude: number | null;
    latitude: number | null;
    qr_code_url: string | null;
    privacy_setting: 'private' | 'public' | 'shared';
    created_at: string;
}

export interface Pond {
    id: string;
    farm_id: string;
    pond_code: string | null;
    name: string;
    area_m2: number | null;
    depth_m: number | null;
    status: 'active' | 'inactive' | 'in_use';
    species_type: string | null;
    stocking_date: string | null;
    created_at: string;
}
