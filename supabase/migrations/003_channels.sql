-- supabase/migrations/003_channels.sql

-- 1. Adicionar colunas Evolution API em tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS evolution_api_url TEXT,
  ADD COLUMN IF NOT EXISTS evolution_api_key TEXT,
  ADD COLUMN IF NOT EXISTS evolution_instance_name TEXT;

-- 2. Migrar leads com status 'open' para 'novo'
UPDATE leads SET status = 'novo' WHERE status = 'open' OR status IS NULL;

-- 3. Indexes para performance do Kanban
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status);

-- 4. Adicionar leads ao Supabase Realtime (necessário para Kanban em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- 5. RLS: permitir UPDATE no próprio tenant
CREATE POLICY "tenants_update_own" ON tenants
  FOR UPDATE USING (id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));
