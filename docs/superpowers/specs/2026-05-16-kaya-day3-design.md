# Kaya Day 3 — Design Spec
_Leads CRM + Canais WhatsApp + Agenda_

## Objetivo

Completar as três áreas que faltam na área logada: gestão de leads via Kanban CRM, configuração do canal WhatsApp (Evolution API) com QR code e polling de status, e integração do link de agenda no system prompt do agente.

---

## Arquitetura

```
app/(app)/
  leads/page.tsx        → CRM Kanban (Client Component) — substitui placeholder
  channels/page.tsx     → Config WhatsApp (Client Component) — nova rota

app/api/
  channels/route.ts     → Proxy server-side para Evolution API
                          GET ?action=status → connectionState
                          GET ?action=qrcode → QR base64
                          POST (body: config) → salva config no DB

supabase/migrations/
  003_channels.sql      → ALTER TABLE tenants: 3 novas colunas Evolution
                          UPDATE leads SET status='novo' WHERE status='open'

lib/
  claude.ts             → Atualizar system prompt: incluir calendar_url quando preenchido

app/(app)/settings/page.tsx  → Adicionar campo calendar_url ao form existente

components/layout/Sidebar.tsx → Adicionar item "Canais" → /channels entre Leads e Ajustes
```

---

## Banco de Dados

### Migration 003 (`supabase/migrations/003_channels.sql`)

```sql
-- Colunas Evolution API no tenant
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS evolution_api_url TEXT,
  ADD COLUMN IF NOT EXISTS evolution_api_key TEXT,
  ADD COLUMN IF NOT EXISTS evolution_instance_name TEXT;

-- Migrar status 'open' existente para 'novo'
UPDATE leads SET status = 'novo' WHERE status = 'open';

-- Index para Kanban por status
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status);

-- RLS: tenants UPDATE para donos
CREATE POLICY "tenants_update_own" ON tenants
  FOR UPDATE USING (id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

**Status values de leads:** `novo` | `em_conversa` | `qualificado` | `fechado`

---

## Leads CRM (`app/(app)/leads/page.tsx`)

**Tipo:** Client Component (`'use client'`)

### Layout

4 colunas horizontais, cada uma com:
- Header: nome da coluna + badge com contagem
- Lista de cards (draggable)
- Botão "+" para criar lead nessa coluna (atalho)

Em mobile: scroll horizontal ou tabs por coluna.

### Card de lead

```
┌──────────────────────────┐
│ João Silva               │
│ 📱 WhatsApp · +55119...  │
│ Há 2 horas               │
└──────────────────────────┘
```

- Nome do lead (ou telefone formatado se sem nome)
- Badge de canal: `WhatsApp` / `Manual`
- Tempo relativo desde `created_at`
- `draggable={true}` — HTML5 drag-and-drop nativo

### Drag-and-drop

```typescript
// onDragStart: guarda o lead id no dataTransfer
// onDragOver: e.preventDefault() para permitir drop
// onDrop: extrai id, chama updateLeadStatus(id, newStatus)
// updateLeadStatus: POST /api/leads (ou service client direto)
```

Atualiza via Supabase **anon client com RLS** (política `leads_update_own_tenant` já existe):
```typescript
await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
```

Atualiza estado local imediatamente (optimistic update) — se der erro, reverte.

### Criar lead (modal)

Botão "Novo lead +" (top-right do header) → overlay modal:

```
┌────────────────────────────────┐
│  Novo lead                     │
│  Nome (opcional):  [______]    │
│  Telefone*:        [______]    │
│  Canal:            [WhatsApp▼] │
│  [Cancelar]  [Criar lead →]    │
└────────────────────────────────┘
```

Submit → INSERT `leads` com `status: 'novo'`, `tenant_id`, `channel`, `phone`, `name`.

### Drawer de detalhe

Click no card → slide-in drawer lateral (320px) com:
- Nome, telefone, canal, status (badge colorido)
- Tags (array, exibir como chips)
- Data de criação
- Botão "Ver no Inbox →" → `router.push('/inbox')`

### Realtime

```typescript
supabase.channel(`leads:${tenantId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'leads',
      filter: `tenant_id=eq.${tenantId}` }, handleLeadChange)
  .subscribe()
```

INSERT: adiciona à coluna correta. UPDATE: move card para nova coluna ou atualiza dados.

### Queries iniciais

```typescript
const { data: leads } = await supabase
  .from('leads')
  .select('id, name, phone, channel, status, tags, created_at')
  .order('created_at', { ascending: false })
```

(RLS filtra por tenant automaticamente via anon client autenticado)

---

## Canais (`app/(app)/channels/page.tsx`)

**Tipo:** Client Component (`'use client'`)

### Estados da tela

**Estado 1 — Não configurado:**
```
┌─────────────────────────────────────────┐
│  Conectar WhatsApp via Evolution API    │
│                                         │
│  URL da instância *                     │
│  [https://minha-evolution.com         ] │
│                                         │
│  API Key *                              │
│  [evo_sk_...                          ] │
│                                         │
│  Nome da instância *                    │
│  [minha-kaya                          ] │
│                                         │
│         [Salvar e conectar →]           │
└─────────────────────────────────────────┘
```

**Estado 2 — Aguardando QR:**
```
┌─────────────────────────────────────────┐
│  🟡 Aguardando conexão                  │
│                                         │
│  ┌─────────────────┐                   │
│  │  [QR Code img]  │  ← base64 da      │
│  │   200 × 200 px  │    Evolution API  │
│  └─────────────────┘                   │
│                                         │
│  Escaneie com o WhatsApp do número     │
│  que vai atender seus leads.           │
│                                         │
│  [🔄 Atualizar QR]  [Desconectar]      │
└─────────────────────────────────────────┘
```

**Estado 3 — Conectado:**
```
┌─────────────────────────────────────────┐
│  🟢 WhatsApp conectado                  │
│  Instância: minha-kaya                  │
│                                         │
│  Mensagens recebidas serão processadas │
│  automaticamente pela Kaya.            │
│                                         │
│  [Editar configuração]  [Desconectar]  │
└─────────────────────────────────────────┘
```

### API Route (`app/api/channels/route.ts`)

**GET `?action=status`:**
1. Autentica usuário (SSR client)
2. Busca `evolution_api_url`, `evolution_api_key`, `evolution_instance_name` do tenant
3. Chama `GET {url}/instance/connectionState/{instance}` com header `apikey: {key}`
4. Retorna `{ state: 'open' | 'connecting' | 'close' | 'unconfigured' }`

**GET `?action=qrcode`:**
1. Autentica usuário (SSR client)
2. Busca config do tenant
3. Chama `GET {url}/instance/fetchInstances` com header `apikey: {key}`
4. Extrai `base64` do QR da instância correspondente
5. Retorna `{ base64: string | null }`

**POST (salvar config):**
1. Autentica usuário (SSR client) → obtém `tenant_id`
2. Valida campos obrigatórios (url, key, instance name)
3. Usa service client: `UPDATE tenants SET evolution_api_url=..., evolution_api_key=..., evolution_instance_name=... WHERE id=tenant_id`
4. Retorna `{ ok: true }`

**Polling no client:**
```typescript
useEffect(() => {
  if (connectionState !== 'connecting') return
  const id = setInterval(() => fetchStatus(), 5000)
  return () => clearInterval(id)
}, [connectionState])
```

### Sidebar update

Adicionar `{ id: 'channels', label: 'Canais', href: '/channels', icon: '◎' }` ao array `navItems` do `Sidebar.tsx`, entre Leads e Ajustes.

---

## Agenda (calendar_url)

### Settings (`app/(app)/settings/page.tsx`)

Adicionar campo ao form existente, abaixo do knowledge_base:

```tsx
<div>
  <label>Link de agendamento (Cal.com, Calendly...)</label>
  <input
    type="url"
    placeholder="https://cal.com/seunome/30min"
    value={calendarUrl}
    onChange={e => setCalendarUrl(e.target.value)}
  />
  <small>Quando um lead quiser agendar, o agente vai enviar este link.</small>
</div>
```

Salva no `agent_configs.calendar_url` via `upsert` existente (adicionar campo ao objeto).

### System Prompt (`lib/claude.ts`)

Adicionar ao final do system prompt quando `calendar_url` estiver preenchido:

```typescript
if (agentConfig.calendar_url) {
  systemPrompt += `\n\nQuando o lead demonstrar interesse em agendar uma consulta, visita ou demonstração, mencione que pode agendar diretamente aqui: ${agentConfig.calendar_url}`
}
```

---

## Decisões técnicas

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Drag-and-drop | HTML5 API nativa | Sem dependência extra; funciona bem para Kanban simples |
| Status update | Anon client (RLS ativa) | RLS já tem `leads_update_own_tenant`; sem necessidade de service client |
| Evolution API proxy | API route server-side | Mantém `evolution_api_key` fora do bundle do cliente |
| Polling QR | setInterval 5000ms | Simples; para quando state = 'open' |
| Config storage | Colunas em `tenants` | Consistente com o padrão existente do schema |
| Optimistic update | Sim para drag-and-drop | UX mais fluida; reverte em caso de erro |

---

## Graceful degradation

| Recurso | Sem config | Com config |
|---------|-----------|-----------|
| Leads CRM | Funciona — leads criados manualmente | Leads chegam via webhook do WhatsApp |
| Canais | Mostra form de configuração | QR + status de conexão real |
| Agenda | Campo vazio no settings | Agente menciona link automaticamente |

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/003_channels.sql` | Criar |
| `app/(app)/leads/page.tsx` | Reescrever (era placeholder) |
| `app/(app)/channels/page.tsx` | Criar |
| `app/api/channels/route.ts` | Criar |
| `lib/claude.ts` | Modificar: adicionar calendar_url ao system prompt |
| `app/(app)/settings/page.tsx` | Modificar: adicionar campo calendar_url |
| `components/layout/Sidebar.tsx` | Modificar: adicionar item Canais |
