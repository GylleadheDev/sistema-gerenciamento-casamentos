# 💍 VowPay & VenueOS — SaaS de Gerenciamento de Eventos de Casamento com Precificação Dinâmica

Sistema SaaS completo desenvolvido com **Backend em Go (Golang)** e **Frontend em Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui**, projetado especificamente para eliminar o problema de contratos de casamento fechados para um número fixo de convidados onde os noivos acabam convidando pessoas a mais sem reajuste proporcional.

---

## 🎯 Como o Sistema Resolve a Regra de Negócio

1. **Apenas 2 Perfis com Login (`ADMIN` e `NOIVOS`) — Convidados NÃO precisam de Login:**
   - **1. Admin (Dono do Estabelecimento / Buffet / Espaço):** Tem controle total sobre todos os casamentos, configura o valor do pacote base, a cota de convidados inclusos, o valor por adulto excedente, valor por criança excedente, gatilho de faixa 2 (equipe extra), custo de mesa adicional, valores dos cardápios por pessoa, serviços extras e pode bloquear/desbloquear alterações na lista.
   - **2. Painel dos Noivos:** Têm controle completo sobre sua lista de convidados, acompanhantes, distribuição de mesas, escolha de cardápio e serviços opcionais. **Porém, toda e qualquer alteração está 100% atrelada em tempo real à tabela de preços do Admin**:
     - Antes mesmo de confirmar a adição de um convidado, um **Simulador Instantâneo** mostra se aquele convidado cabe na cota contratada ou quanto ele adicionará ao contrato (excedente por cabeça + impacto proporcional no buffet/open bar + mesas extras).
     - Ao ultrapassar a cota inclusa, um **Modal de Aceite de Reajuste Automático** exige ciência do valor adicional antes de incluir o convidado.
     - Se um convidado recusar o convite (`Não Irá`) ou for removido, o sistema abate automaticamente o custo excedente.
   - **3. Portal RSVP Público dos Convidados (Sem Login!):** Os convidados não precisam criar conta nem senha. Basta digitarem seu nome ou código do convite (ex: `HELE-A101`) para confirmar presença e informar restrições alimentares.

---

## 🚀 Tecnologias Utilizadas

- **Backend:** Go (`net/http`, motor financeiro concorrente com `sync.RWMutex`, persistência JSON automática em `backend/data/database.json` e testes automatizados `go test`).
- **Frontend:** Vite 6, React 19, TypeScript, **Tailwind CSS v4** (`@tailwindcss/vite`), componentes **shadcn/ui** e ícones `lucide-react`.

---

## 🛠️ Como Executar Localmente

### 1. Iniciar o Backend em Go (Porta `8080`)
```bash
cd backend
go test -v ./...
go run .
```

### 2. Iniciar o Frontend em Vite + Tailwind CSS v4 (Porta `5173`)
```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

### 🔑 Credenciais de Demonstração (ou use o Seletor Instantâneo no Topo)
- **Admin (Dono do Espaço):** `admin@espacoimperial.com` / `admin123`
- **Noivos (Clara & Gabriel):** `noivos@casamento.com` / `noivos123`
- **Convidados (Sem Login):** Clique na aba **"3. RSVP Convidado (Sem Login)"** e busque por `Helena`, `Beatriz`, `Lucas` ou `HELE-A101`.
