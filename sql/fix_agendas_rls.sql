-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.agendas;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.agendas;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.agendas;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.agendas;

-- Create permissive policies (Public Access)
CREATE POLICY "Enable read access for all users" ON public.agendas
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.agendas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.agendas
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON public.agendas
    FOR DELETE USING (true);
