-- =====================================================
-- NEP FORUM - TABELAS SUPABASE
-- =====================================================

-- 1. TÓPICOS DO FÓRUM
CREATE TABLE IF NOT EXISTS forum_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id TEXT NOT NULL,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    author_uid TEXT NOT NULL,
    author_nome TEXT NOT NULL,
    author_cargo TEXT,
    views INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    solved BOOLEAN DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    solution_reply_id UUID,
    has_attachments BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RESPOSTAS DO FÓRUM
CREATE TABLE IF NOT EXISTS forum_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    author_uid TEXT NOT NULL,
    author_nome TEXT NOT NULL,
    author_cargo TEXT,
    likes INTEGER DEFAULT 0,
    liked_by TEXT[] DEFAULT '{}',
    is_solution BOOLEAN DEFAULT FALSE,
    has_attachments BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ANEXOS DO FÓRUM
CREATE TABLE IF NOT EXISTS forum_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_type TEXT NOT NULL CHECK (parent_type IN ('topic', 'reply')),
    parent_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploaded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON forum_topics(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_author ON forum_topics(author_uid);
CREATE INDEX IF NOT EXISTS idx_forum_topics_created ON forum_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON forum_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_attachments_parent ON forum_attachments(parent_type, parent_id);

-- TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_forum_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_forum_topics_updated
    BEFORE UPDATE ON forum_topics
    FOR EACH ROW
    EXECUTE FUNCTION update_forum_timestamp();

CREATE TRIGGER trigger_forum_replies_updated
    BEFORE UPDATE ON forum_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_forum_timestamp();

-- TRIGGER PARA ATUALIZAR CONTADOR DE RESPOSTAS
CREATE OR REPLACE FUNCTION update_replies_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forum_topics SET replies_count = replies_count + 1 WHERE id = NEW.topic_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE forum_topics SET replies_count = replies_count - 1 WHERE id = OLD.topic_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_forum_replies_count
    AFTER INSERT OR DELETE ON forum_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_replies_count();

-- RLS (Row Level Security)
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (ajuste conforme necessidade)
CREATE POLICY "Forum topics são públicos" ON forum_topics FOR SELECT USING (true);
CREATE POLICY "Usuários podem criar tópicos" ON forum_topics FOR INSERT WITH CHECK (true);
CREATE POLICY "Autores podem editar seus tópicos" ON forum_topics FOR UPDATE USING (true);
CREATE POLICY "Autores podem deletar seus tópicos" ON forum_topics FOR DELETE USING (true);

CREATE POLICY "Forum replies são públicas" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "Usuários podem criar replies" ON forum_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Autores podem editar suas replies" ON forum_replies FOR UPDATE USING (true);
CREATE POLICY "Autores podem deletar suas replies" ON forum_replies FOR DELETE USING (true);

CREATE POLICY "Forum attachments são públicos" ON forum_attachments FOR SELECT USING (true);
CREATE POLICY "Usuários podem criar attachments" ON forum_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Autores podem deletar attachments" ON forum_attachments FOR DELETE USING (true);

-- STORAGE BUCKET (executar no painel do Supabase)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('forum-attachments', 'forum-attachments', true);
