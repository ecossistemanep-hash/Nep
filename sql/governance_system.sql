-- SISTEMA DE GOVERNANÇA E GESTÃO (Substitui módulo de OKR)

-- 1. Tabela de OKRs
CREATE TABLE IF NOT EXISTS gov_okrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lider TEXT NOT NULL,
    periodo TEXT NOT NULL,
    objetivo TEXT NOT NULL,
    kr1_titulo TEXT NOT NULL,
    kr1_baseline TEXT,
    kr1_meta TEXT NOT NULL,
    kr1_atual TEXT,
    kr2_titulo TEXT,
    kr2_baseline TEXT,
    kr2_meta TEXT,
    kr2_atual TEXT,
    kr3_titulo TEXT,
    kr3_baseline TEXT,
    kr3_meta TEXT,
    kr3_atual TEXT,
    fonte_dados TEXT NOT NULL,
    owner_dados TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Tabela de Cases de Sucesso
CREATE TABLE IF NOT EXISTS gov_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responsavel TEXT NOT NULL,
    data_registro DATE NOT NULL,
    titulo TEXT NOT NULL,
    contexto TEXT NOT NULL,
    solucao TEXT NOT NULL,
    resultados TEXT NOT NULL,
    area_impacto TEXT NOT NULL, -- Qualidade, Performance, etc.
    status TEXT NOT NULL DEFAULT 'Aguardando Validação', -- Aguardando Validação, Validado, Revisão
    feedback_gestao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. Tabela de Sugestões de Melhoria
CREATE TABLE IF NOT EXISTS gov_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responsavel TEXT NOT NULL,
    data_registro DATE NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    impacto_esperado TEXT NOT NULL,
    categoria TEXT NOT NULL, -- Processo, Tecnologia, etc.
    prioridade TEXT NOT NULL, -- Alta, Média, Baixa
    status TEXT NOT NULL DEFAULT 'Aguardando Análise', -- Aguardando, Aprovada, Implementada...
    cliente_solicitante TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 4. Tabela de Elogios Formais
CREATE TABLE IF NOT EXISTS gov_compliments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responsavel_registro TEXT NOT NULL,
    data_registro DATE NOT NULL,
    quem_elogiou TEXT NOT NULL, -- Cliente/Parceiro
    quem_recebeu TEXT NOT NULL, -- Colaborador/Time
    motivo TEXT NOT NULL,
    canal_origem TEXT NOT NULL, -- Email, WhatsApp, Reunião...
    evidencia_url TEXT, -- Link para print/arquivo se houver
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. Tabela de Rituais e Prazos
CREATE TABLE IF NOT EXISTS gov_rituals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_ritual TEXT NOT NULL, -- Reunião Mensal, Report Semanal, etc.
    data_prevista DATE NOT NULL,
    data_realizada TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'Pendente', -- Pendente, Realizado, Atrasado, Cancelado
    responsavel TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Recuperação Financeira
CREATE TABLE IF NOT EXISTS gov_recovery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responsavel TEXT NOT NULL,
    data_registro DATE NOT NULL,
    valor_recuperado DECIMAL(15,2) NOT NULL,
    cliente TEXT NOT NULL,
    descricao_acao TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ADD RLS POLICIES (Simples para começar, depois refinamos)
ALTER TABLE gov_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov_compliments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov_rituals ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov_recovery ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para todos autenticados
CREATE POLICY "Leitura Pública Governança" ON gov_okrs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Leitura Pública Cases" ON gov_cases FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Leitura Pública Sugestões" ON gov_suggestions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Leitura Pública Elogios" ON gov_compliments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Leitura Pública Rituais" ON gov_rituals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Leitura Pública Recuperação" ON gov_recovery FOR SELECT USING (auth.role() = 'authenticated');

-- Permitir insert/update para todos autenticados (Sistema interno confiável por enquanto)
-- Idealmente restringir a Admins ou Owners, mas para facilitar a migração inicial:
CREATE POLICY "Escrita Geral Governança" ON gov_okrs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Escrita Geral Cases" ON gov_cases FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Escrita Geral Sugestões" ON gov_suggestions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Escrita Geral Elogios" ON gov_compliments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Escrita Geral Rituais" ON gov_rituals FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Escrita Geral Recuperação" ON gov_recovery FOR ALL USING (auth.role() = 'authenticated');
