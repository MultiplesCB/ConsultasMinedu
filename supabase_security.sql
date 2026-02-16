-- Enable Row Level Security (RLS) on the boletas table
ALTER TABLE boletas ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read (SELECT) data
-- This is necessary for the public search functionality
CREATE POLICY "Public can select boletas" 
ON boletas 
FOR SELECT 
TO anon 
USING (true);

-- Create a policy that allows only authenticated users to insert/update/delete
-- This secures the upload and sync functionality
CREATE POLICY "Admins can insert boletas" 
ON boletas 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Admins can update boletas" 
ON boletas 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Admins can delete boletas" 
ON boletas 
FOR DELETE 
TO authenticated 
USING (true);

-- OPTIONAL: Create a Profiles table if you want to store admin details
-- For this simple app, just using Supabase Auth users is enough.

-- INSTRUCTIONS:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add User" and create your admin account (email/password)
-- 3. Run this script in the SQL Editor to secure the database.
