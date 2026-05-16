-- supabase/migrations/002_realtime.sql
-- Enable realtime for inbox
-- NOTE: Run this in the Supabase SQL Editor at https://supabase.com/dashboard/project/ymrtzzatqgejjhispbvo/sql

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Allow tenants to update their own messages (e.g., mark approved, update suggested_reply via UI)
CREATE POLICY "messages_update_own_tenant" ON messages
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Allow tenants to update conversation mode (copilot/auto toggle)
CREATE POLICY "conversations_update_own_tenant" ON conversations
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));
