-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Drop existing auth.users policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to read auth.users" ON auth.users;

-- Create policy to allow authenticated users to read auth.users
CREATE POLICY "Allow authenticated users to read auth.users"
ON auth.users FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role_id IN (
            SELECT id FROM roles
            WHERE name IN ('Admin', 'Owner')
        )
    )
);

-- Create a secure wrapper function to check user role
CREATE OR REPLACE FUNCTION auth.check_user_role(role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    INNER JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Owners can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Owners can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy for owners to view all profiles
CREATE POLICY "Owners can view all profiles" ON profiles
    FOR ALL
    USING (auth.check_user_role('Owner'));

-- Policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT
    USING (auth.check_user_role('Admin'));

-- Policy for users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Policy for profile insertion (needed for new user creation)
CREATE POLICY "Enable insert for authenticated users" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id OR auth.check_user_role('Owner')); 