-- Create the 'boletas' table
CREATE TABLE IF NOT EXISTS boletas (
    id SERIAL PRIMARY KEY,
    periodo TEXT,
    dni TEXT NOT NULL,
    nombres TEXT,
    cargo TEXT,
    situacion TEXT,
    total_haberes NUMERIC(10, 2),
    total_descuentos NUMERIC(10, 2),
    liquido NUMERIC(10, 2),
    json_data JSONB, -- Stores the full income/discount details
    
    -- New columns for enhanced querying
    codigo_modular TEXT,
    codigo_cargo TEXT,
    codigo_servidor TEXT,
    tipo_servidor TEXT,
    nivel_magisterial TEXT,
    codigo_situacion TEXT,
    leyenda TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint to avoid duplicates for same period/dni/cargo
    -- OLD: UNIQUE(periodo, dni)
    UNIQUE(periodo, dni, codigo_cargo)
);

-- MIGRATION COMMANDS (Run these if table already exists)
-- ALTER TABLE boletas DROP CONSTRAINT IF EXISTS boletas_periodo_dni_key;
-- ALTER TABLE boletas ADD CONSTRAINT boletas_periodo_dni_cargo_key UNIQUE (periodo, dni, codigo_cargo);

-- Create an index on DNI for fast searching
CREATE INDEX IF NOT EXISTS idx_boletas_dni ON boletas(dni);

-- Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE boletas ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (Adjust as needed for better security)
CREATE POLICY "Allow anon select" ON boletas FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON boletas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON boletas FOR UPDATE USING (true);
