-- Farms table
CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  farm_code VARCHAR(50),
  area_hectares NUMERIC,
  address TEXT,
  longitude NUMERIC,
  latitude NUMERIC,
  qr_code_url TEXT,
  privacy_setting VARCHAR(50) DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_farms_user_id ON farms(user_id);

-- Ponds table
CREATE TABLE ponds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  name_prefix VARCHAR(50),
  auto_number INTEGER,
  pond_code VARCHAR(50),
  type VARCHAR(50), -- 'square', 'circle', 'earthen', 'lined'
  length_m NUMERIC,
  width_m NUMERIC,
  area_m2 NUMERIC,
  depth_m NUMERIC,
  rfid_tag VARCHAR(100),
  species_type VARCHAR(50), -- 'vannamei', 'monodon'
  stocking_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ponds_farm_id ON ponds(farm_id);

-- Cultivation Cycles table (managing specific crops)
CREATE TABLE cultivation_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pond_id UUID NOT NULL REFERENCES ponds(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'harvested', 'cancelled'
  species VARCHAR(50), -- 'vannamei', 'monodon'
  stocking_density NUMERIC, -- shrimp per m2
  total_seed_count INTEGER,
  target_size_count INTEGER, -- target head count per kg
  target_days INTEGER,
  target_survival_rate NUMERIC,
  hatchery_source VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cycles_pond_id ON cultivation_cycles(pond_id);
CREATE INDEX idx_cycles_status ON cultivation_cycles(status);

-- Trigger for updating timestamps
CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON farms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ponds_updated_at BEFORE UPDATE ON ponds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cycles_updated_at BEFORE UPDATE ON cultivation_cycles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
