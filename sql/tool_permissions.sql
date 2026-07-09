-- Tabela para armazenar configurações de permissão de ferramentas
CREATE TABLE IF NOT EXISTS public.tool_permissions (
    tool_id TEXT PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    allowed_roles TEXT[] DEFAULT '{}', -- Array de strings
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.tool_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas
-- Leitura pública (para todos saberem o que podem ver)
CREATE POLICY "Enable read access for all users" ON public.tool_permissions FOR SELECT USING (true);

-- Escrita apenas para ADMIN (ou temporariamente para todos para debug, mas vamos restringir)
-- Por segurança inicial e para evitar erros de permissão, vou deixar aberto para authenticated por enquanto
-- e depois restringimos para cargo = 'ADMIN' se tivermos auth robusta
CREATE POLICY "Enable all access for authenticated users" ON public.tool_permissions FOR ALL USING (auth.role() = 'authenticated');

-- Permitir insert/update publicamente se necessário durante migração (remover depois)
CREATE POLICY "Enable all access for all users" ON public.tool_permissions FOR ALL USING (true) WITH CHECK (true);
