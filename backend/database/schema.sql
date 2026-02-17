-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,  -- Farmer verification status
    verification_level VARCHAR(20) DEFAULT 'basic',  -- basic, verified, certified
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    auth_provider VARCHAR(20) DEFAULT 'email',  -- email, google, facebook, apple
    preferences JSONB DEFAULT '{}',
    
    -- Legacy/Compatibility fields
    roles TEXT DEFAULT '', -- stored as simple array string or modify as needed
    google_id VARCHAR(255) UNIQUE,
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    totp_secret VARCHAR(255),
    backup_codes TEXT
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_phone ON users(phone);

-- OTP Codes Table
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(255) NOT NULL,
    code_type VARCHAR(20) DEFAULT 'login',  -- login, email_verify, password_reset
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attempt_count INTEGER DEFAULT 0,
    is_used BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_otp_codes_user ON otp_codes(user_id);
CREATE INDEX idx_otp_codes_code ON otp_codes(code);

-- Login History Table
CREATE TABLE login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    login_method VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    device_info VARCHAR(255),
    location JSONB,
    success BOOLEAN DEFAULT TRUE,
    failure_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_login_history_user ON login_history(user_id);
CREATE INDEX idx_login_history_created ON login_history(created_at);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    parent_token VARCHAR(500),
    device_type VARCHAR(50),
    device_os VARCHAR(50),
    browser VARCHAR(50),
    ip_address VARCHAR(45),
    location JSONB,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Password Reset Tokens Table (if using separate table, otherwise can use otp_codes or verification_tokens logic)
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(20) DEFAULT 'password_reset',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent VARCHAR(255)
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_crops_pond_id ON crops(pond_id);
CREATE INDEX IF NOT EXISTS idx_water_quality_pond_id ON water_quality_records(pond_id);
CREATE INDEX IF NOT EXISTS idx_feed_records_pond_id ON feed_records(pond_id);
CREATE INDEX IF NOT EXISTS idx_feed_records_crop_id ON feed_records(crop_id);
