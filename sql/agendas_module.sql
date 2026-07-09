-- Create Agendas table
CREATE TABLE IF NOT EXISTS public.agendas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    date TIMESTAMPTZ,
    responsible TEXT,
    type TEXT,
    status TEXT DEFAULT 'Planejada',
    archived BOOLEAN DEFAULT FALSE,
    minute TEXT,
    participants JSONB DEFAULT '[]'::jsonb,
    execution JSONB DEFAULT '{}'::jsonb,
    decisions JSONB DEFAULT '[]'::jsonb,
    pendencies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.agendas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.agendas
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.agendas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.agendas
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.agendas
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.agendas TO postgres;
GRANT ALL ON public.agendas TO anon;
GRANT ALL ON public.agendas TO authenticated;
GRANT ALL ON public.agendas TO service_role;
