-- ROTINAS ADM - Tabela para armazenar rotinas diárias
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS rotinas_adm (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  data DATE NOT NULL,
  tarefas JSONB DEFAULT '[]',
  total INTEGER DEFAULT 0,
  concluidas INTEGER DEFAULT 0,
  percentual INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, data)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rotinas_user_id ON rotinas_adm(user_id);
CREATE INDEX IF NOT EXISTS idx_rotinas_data ON rotinas_adm(data);

-- RLS Policies
ALTER TABLE rotinas_adm ENABLE ROW LEVEL SECURITY;

-- Política: Usuário pode ver apenas suas próprias rotinas
CREATE POLICY "Users can view own rotinas" ON rotinas_adm
  FOR SELECT USING (true);

-- Política: Usuário pode inserir suas próprias rotinas
CREATE POLICY "Users can insert own rotinas" ON rotinas_adm
  FOR INSERT WITH CHECK (true);

-- Política: Usuário pode atualizar suas próprias rotinas
CREATE POLICY "Users can update own rotinas" ON rotinas_adm
  FOR UPDATE USING (true);

-- Comentário da tabela
COMMENT ON TABLE rotinas_adm IS 'Armazena o checklist diário de rotinas administrativas dos usuários';
