export interface User {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    isActive: boolean;
    verificationLevel: string;
    authProvider: string;
    googleId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export interface LoginResponse {
    message: string;
    user?: User;
    accessToken?: string;
    refreshToken?: string;
    requires2fa?: boolean;
    tempToken?: string;
}

export interface RegisterResponse {
    message: string;
    user: User;
    accessToken: string;
    refreshToken: string;
}
