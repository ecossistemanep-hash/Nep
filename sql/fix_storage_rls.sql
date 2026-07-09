-- Execute isso no SQL Editor do Supabase para corrigir o erro de upload

-- 1. Habilitar RLS na tabela objects do storage (se já não estiver)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Criar política para PERMITIR UPLOAD no bucket 'forum-attachments'
-- (Essa política permite que QUALQUER UM faça upload se o bucket for 'forum-attachments')
CREATE POLICY "Permitir Upload Forum Público"
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'forum-attachments' );

-- 3. Criar política para PERMITIR UPDATE (se necessário sobrescrever)
CREATE POLICY "Permitir Update Forum Público"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'forum-attachments' );

-- 4. Criar política para PERMITIR DELETE
CREATE POLICY "Permitir Delete Forum Público"
ON storage.objects FOR DELETE
USING ( bucket_id = 'forum-attachments' );

-- 5. Garantir leitura pública (normalmente já vem com bucket público, mas garante)
CREATE POLICY "Permitir Leitura Forum Público"
ON storage.objects FOR SELECT
USING ( bucket_id = 'forum-attachments' );
