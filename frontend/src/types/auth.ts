export interface User {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    profilePicture?: string;
    authProvider: 'email' | 'google';
    createdAt: string;
}

export interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export interface LoginResponse {
    message: string;
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface RegisterResponse {
    message: string;
    user: User;
    accessToken: string;
    refreshToken: string;
}
