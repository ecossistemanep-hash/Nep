-- TABELA DE TAREFAS (KANBAN)
CREATE TABLE IF NOT EXISTS kanban_tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    owner TEXT,
    unit TEXT,
    status TEXT,
    priority TEXT,
    complexity TEXT,
    deadline DATE,
    points INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- TABELA DE FÉRIAS
CREATE TABLE IF NOT EXISTS vacation_records (
    id TEXT PRIMARY KEY,
    user_name TEXT,
    role TEXT,
    product TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- HABILITAR RLS (Para segurança básica)
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_records ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS (Permite anon_key fazer upsert para demonstração - Ajustar em produção)
CREATE POLICY "Allow anon upsert" ON kanban_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon upsert" ON vacation_records FOR ALL USING (true) WITH CHECK (true);
