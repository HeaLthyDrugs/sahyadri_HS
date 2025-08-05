-- Add password column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT NULL;

-- Update the trigger function to handle password
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
        password,
        avatar_url,
        role_id,
        is_active
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'password',
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE((NEW.raw_user_meta_data->>'role_id')::UUID, default_role_id),
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;