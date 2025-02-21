-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing objects if they exist (in correct order)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.permissions;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.roles;

-- Create the roles table first
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT roles_name_key UNIQUE (name)
);

-- Insert default roles immediately after creation
INSERT INTO public.roles (name, description) 
VALUES 
    ('Owner', 'Owner with complete system access'),
    ('Admin', 'Administrator with full access'),
    ('User', 'Regular user with limited access')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
DROP POLICY IF EXISTS "Owner can manage roles" ON public.roles;

-- Create simplified policies for roles
CREATE POLICY "Roles are viewable by everyone" 
    ON public.roles FOR SELECT 
    USING (true);

CREATE POLICY "Owner can manage roles" 
    ON public.roles 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'Owner'
        )
    );

-- Now create the profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role_id UUID REFERENCES public.roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins and Owners can manage profiles"
    ON public.profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' IN ('Admin', 'Owner')
        )
    );

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
BEGIN
    -- Get the default role (User role)
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'User' LIMIT 1;

    -- Set the role in user metadata
    NEW.raw_user_meta_data = 
        COALESCE(NEW.raw_user_meta_data::jsonb, '{}'::jsonb) || 
        jsonb_build_object('role', 'User');

    -- Insert the profile
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        role_id,
        is_active
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        default_role_id,
        true
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();