# Kaya MVP — Design Spec
_Day 1: Foundation + Landing | Day 2: Core AI + WhatsApp | Day 3: Product + Onboarding | Day 4: Billing + Launch_

## Context

Kaya é um SaaS de agente de vendas IA para PMEs brasileiras. O dono cola a URL do site, a Kaya monta um agente, conecta no WhatsApp e responde leads 24h automaticamente. MVP em 4 dias com Next.js 14, Supabase, Claude API, Evolution API (WhatsApp) e Asaas (pagamento).

**Repositório**: greenfield — só README  
**Supabase**: projeto criado, schema em branco  
**Evolution API**: deixar para depois do Day 2  
**Instagram**: Fase 2 (fora do MVP)

---

## Arquitetura Geral

```
(marketing)/          → landing page pública
(app)/                → área autenticada (middleware protege)
api/                  → webhook, agent, asaas, calendar, onboarding
auth/                 → login, signup, callback
```

**Stack**:
- Next.js 14 App Router + TypeScript
- Supabase: Postgres + Auth + Realtime + RLS
- Claude API (Anthropic SDK) — agente IA por tenant
- Evolution API — WhatsApp (Day 2+)
- Asaas — pagamento PIX/boleto/recorrência (Day 4)
- Vercel — deploy frontend

**Multi-tenancy**: cada PME é um `tenant`. RLS do Supabase isola todos os dados por `tenant_id` automaticamente via `auth.uid()`.

---

## Banco de Dados (7 tabelas)

| Tabela | Propósito |
|--------|-----------|
| `tenants` | PME assinante — tokens, plano, config do agente |
| `users` | Donos e funcionários ligados a um tenant |
| `leads` | Contatos que mandam mensagem (phone, canal, status, tags) |
| `conversations` | Thread de conversa por lead/canal, com modo (auto/copilot/triage) |
| `messages` | Cada mensagem com role, suggested_reply, approved |
| `agent_configs` | Tom, nicho, knowledge_base, calendar_url por tenant |
| `payments` | Cobranças Asaas por tenant |

Todas com `ENABLE ROW LEVEL SECURITY` + policies `SELECT/INSERT` filtrando por `tenant_id`.

---

## Day 1: Foundation + Landing

### Auth
- **Supabase SSR** (`@supabase/ssr`) — server-side, sem NextAuth
- Signup cria `tenant` + `user` em transação
- `middleware.ts` protege todas as rotas `/(app)/*`, redireciona para `/auth/login`
- Callback em `/auth/callback/route.ts` troca code por sessão

### Design System (CSS vars globais)
```css
--salmon: #FF91A4    --salmon-deep: #F26B85
--rose: #FFD1DC      --rose-soft: #FFE6EC
--cream: #FAF6F2     --paper: #FFFFFF
--ink: #141414       --ink-soft: #6B6A66 (alias --muted)
--line: #E8E4E0      --line-soft: #F0EDE9
```
Fontes via `next/font/google`: Plus Jakarta Sans (400, 500, 600, 700) + Instrument Serif (400 italic)

### App Shell
Sidebar (240px, cream) + TopBar — fiéis ao mockup `product.jsx`:
- Logo wordmark no topo
- Bloco de negócio ativo (tenant name + status IA)
- Nav: Resumo, Conversas, Leads, Agenda, Tom de voz, Canais, Ajustes
- Rodapé: plano + barra de uso de mensagens
- Páginas placeholder com layout correto

### Landing Page (5 seções)
Baseada em `landing.jsx`:
1. **Nav**: logo + links + CTA "Conectar meu site →"
2. **Hero**: tagline "Atende. Agenda. Acabou." + phone mockup WhatsApp + badge beta
3. **Como funciona**: 3 passos em cards (URL → Conecta canais → Lead resolve)
4. **Features grid**: 6 features em grid 3×2 com borda table
5. **Proof**: métricas + 3 depoimentos
6. **CTA dark**: blob salmão + "Hoje seu lead dorme. Amanhã ele agenda." + CTA

---

## Day 2: Core IA + Evolution API

- `lib/claude.ts`: `generateResponse(message, agentConfig)` — system prompt dinâmico por tenant (tom, nicho, knowledge_base)
- `api/webhook/route.ts`: recebe mensagem Evolution → salva em `messages` → chama Claude → responde automaticamente
- `api/agent/route.ts`: POST `{ conversationId, leadMessage }` → Claude responde → salva → retorna sugestão
- Realtime Supabase em `InboxPage`: canal `messages` para atualizações ao vivo

---

## Day 3: Produto + Onboarding

- **Onboarding flow**: cola URL do site → IA lê e monta knowledge_base → escolhe tom (descontraído/formal/consultivo) → escolhe nicho → conecta WhatsApp (QR code Evolution) → cria `agent_config`
- **Dashboard**: 4 stat cards (leads, respondidos, agendamentos, receita estimada) + gráfico de volume + funil da semana + tabela "leads precisando de você"
- **Inbox**: lista de conversas + área de chat com realtime + painel de contexto do lead (interesse, origem, intenção 1-5) + suggested reply com botão "Enviar →"
- **Settings**: editar tone, niche, knowledge_base, reconectar WhatsApp

---

## Day 4: Monetização + Launch

- Planos: free, pro (R$297/mês), enterprise (contato)
- Asaas: criar subscription, webhook em `/api/asaas/route.ts` confirma pagamento → atualiza `tenant.plan`
- Domínio + DNS → Vercel
- Testes E2E: signup → onboarding → mensagem → agente responde

---

## Decisões Técnicas

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Auth | Supabase SSR | Sem complexidade de NextAuth; RLS já integra |
| WhatsApp | Evolution API | Mais simples que Meta direto para MVP |
| Instagram | Fase 2 | Fora do escopo MVP |
| Pagamento MVP | PIX manual | Asaas em Day 4, não bloqueia Days 1-3 |
| Calendar | Google Calendar | Spec principal; Calendly como Fase 2 |
| Realtime | Supabase channels | Nativo, sem WebSocket extra |
