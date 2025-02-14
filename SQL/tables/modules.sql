-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    path VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create role_modules junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS role_modules (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, module_id)
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 