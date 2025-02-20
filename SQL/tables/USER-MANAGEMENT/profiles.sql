-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles;

-- Create the profiles table that Supabase expects
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role_id UUID REFERENCES roles(id),
    updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for secure access
CREATE POLICY "Public profiles are viewable by everyone."
    ON public.profiles FOR SELECT
    USING ( true );

CREATE POLICY "Users can insert their own profile."
    ON public.profiles FOR INSERT
    WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
    ON public.profiles FOR UPDATE
    USING ( auth.uid() = id );

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
BEGIN
    -- Get the default role (assuming 'User' is the default role)
    SELECT id INTO default_role_id FROM roles WHERE name = 'User' LIMIT 1;

    -- Insert into Supabase's expected profiles table
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role_id,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        default_role_id,
        now()
    );

    -- Also insert into our custom user_profiles table
    INSERT INTO public.user_profiles (
        auth_id,
        email,
        role_id,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        default_role_id,
        now(),
        now()
    );

    -- Insert default permissions for the user's role if they don't exist
    INSERT INTO public.permissions (role_id, page_name, can_view, can_edit)
    SELECT 
        default_role_id,
        page_path,
        true,  -- can_view for basic pages
        false  -- can_edit set to false by default
    FROM (
        VALUES
            ('/dashboard'),
            ('/dashboard/profile')
    ) AS p(page_path)
    WHERE NOT EXISTS (
        SELECT 1 
        FROM permissions 
        WHERE role_id = default_role_id 
        AND page_name = p.page_path
    );

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error (you can customize this part)
        RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 