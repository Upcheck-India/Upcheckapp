import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL') || '',
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // ==================== User Operations ====================

  async createUser(userData: {
    email: string;
    passwordHash?: string;
    name: string;
    authProvider?: string;
    googleId?: string;
    emailVerified?: boolean;
    profilePicture?: string;
  }) {
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', userData.email.toLowerCase())
      .single();

    // User exists, we can return or throw. For now, let's throw conflict to be handled by caller
    // But wait, the caller (AuthService) checks existence too.
    // So this check here is redundant if AuthService does it.
    // However, if we leave it, let's just return existingUser or similar.
    // For now, removing the block to avoid 'pass' error and redundancy.

    const { data, error } = await this.supabase
      .from('users')
      .insert({
        email: userData.email.toLowerCase(),
        password_hash: userData.passwordHash,
        name: userData.name,
        auth_provider: userData.authProvider || 'email',
        google_id: userData.googleId,
        email_verified: userData.emailVerified || false,
        profile_picture: userData.profilePicture,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findUserByEmail(email: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async findUserByGoogleId(googleId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async findUserById(id: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteUser(id: string) {
    const { error } = await this.supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  }

  // ==================== Verification Tokens ====================

  async saveVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
    type: string,
  ) {
    const { error } = await this.supabase.from('verification_tokens').insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
      type,
    });

    if (error) throw error;
  }

  async findToken(token: string, type: string) {
    const { data, error } = await this.supabase
      .from('verification_tokens')
      .select('*')
      .eq('token', token)
      .eq('type', type)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async deleteToken(token: string) {
    await this.supabase.from('verification_tokens').delete().eq('token', token);
  }

  async deleteUserTokens(userId: string, type?: string) {
    let query = this.supabase
      .from('verification_tokens')
      .delete()
      .eq('user_id', userId);

    if (type) {
      query = query.eq('type', type);
    }

    await query;
  }

  async savePasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
    type: string,
  ) {
    // Reusing verification_tokens table as planned
    return this.saveVerificationToken(userId, token, expiresAt, type);
  }

  // ==================== Refresh Tokens ====================

  async saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    const { error } = await this.supabase.from('refresh_tokens').insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
      revoked: false,
    });

    if (error) throw error;
  }

  async findRefreshToken(token: string) {
    const { data, error } = await this.supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', token)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async revokeRefreshToken(token: string) {
    await this.supabase
      .from('refresh_tokens')
      .update({ revoked: true })
      .eq('token', token);
  }

  async revokeAllUserRefreshTokens(userId: string) {
    await this.supabase
      .from('refresh_tokens')
      .update({ revoked: true })
      .eq('user_id', userId);
  }

  async deleteRefreshToken(token: string) {
    await this.supabase.from('refresh_tokens').delete().eq('token', token);
  }

  // ==================== User Sessions ====================

  async createSession(sessionData: {
    userId: string;
    deviceName?: string;
    deviceType?: string;
    ipAddress?: string;
  }) {
    const { data, error } = await this.supabase
      .from('user_sessions')
      .insert({
        user_id: sessionData.userId,
        device_name: sessionData.deviceName,
        device_type: sessionData.deviceType,
        ip_address: sessionData.ipAddress,
        last_active: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSessionActivity(sessionId: string) {
    await this.supabase
      .from('user_sessions')
      .update({ last_active: new Date().toISOString() })
      .eq('id', sessionId);
  }

  async getUserSessions(userId: string) {
    const { data, error } = await this.supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_active', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async deleteSession(sessionId: string) {
    await this.supabase.from('user_sessions').delete().eq('id', sessionId);
  }

  async deleteAllUserSessions(userId: string) {
    await this.supabase.from('user_sessions').delete().eq('user_id', userId);
  }

  // ==================== Cleanup ====================

  async cleanupExpiredTokens() {
    const now = new Date().toISOString();

    await this.supabase
      .from('verification_tokens')
      .delete()
      .lt('expires_at', now);

    await this.supabase
      .from('refresh_tokens')
      .delete()
      .or(`expires_at.lt.${now},revoked.eq.true`);
  }
}
