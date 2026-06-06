-- Disable RLS on clients table since this is an internal sales tool with no auth
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
