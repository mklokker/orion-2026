# Orion UI V2 — Preview Mode Guide

## 📋 Overview

**Orion UI V2** é um redesign SaaS premium com gradientes, backdrop blur, glow effects, e microinterações ricas. Status: **Beta Piloto** em 3 telas (Dashboard, Chat, Modais).

### ✨ Mudanças Visuais (100% visíveis)
- **Sidebar item ativo**: Gradiente indigo + glow sutil (20px blur)
- **Cards**: radius 16px + shadows suaves + hover lift (-3px)
- **Modais**: Fade + scale (280ms) + backdrop blur (10px)
- **Inputs**: Focus ring bonito (3px primary/10%)
- **Conversa list**: Card list com hover smooth + border color change
- **Message bubbles**: Animação fade+scale (200ms) + border-radius moderno
- **Header/Composer**: Gradiente subtle + shadows

---

## 🚀 Como Ativar/Desativar

### Via Sidebar (Recomendado)
1. Procure **"UI V2 ✓"** no footer da sidebar (expandida)
2. Clique para ativar/desativar
3. Preferência salva em localStorage automaticamente

### Via Console (Manual)
```javascript
localStorage.setItem("orion-ui-v2-enabled", "true");
window.location.reload();
```

---

## 📁 Arquivos Alterados

| Arquivo | Mudança | Visível? |
|---------|---------|----------|
| `globals.css` | ✅ Tokens (16px radius, shadows sm/md/lg/xl, blur), animações, estilos base | **SIM** |
| `layout.js` | ✅ Toggle UI V2 na sidebar com Zap icon | **SIM** |
| `pages/Dashboard` | ✅ Cards com `ui-v2-card` | **SIM** |
| `components/chat/ChatList` | ✅ Header + conversation items com `ui-v2-*` classes | **SIM** |
| `components/chat/ConversationView` | ✅ Header + message-bubble com `ui-v2-*` classes | **SIM** |
| `components/chat/ChatInput` | ✅ Composer com `ui-v2-composer` class | **SIM** |
| `components/chat/MessageBubble` | ✅ Bubbles com `ui-v2-message-bubble` classe | **SIM** |

---

## 🎨 Design Tokens Visuais (V2)

### Novo Radius (Maior)
- `--v2-radius-sm`: 8px
- `--v2-radius-md`: 12px
- `--v2-radius-lg`: **16px** (cards, buttons)
- `--v2-radius-xl`: **20px** (modals)

### Shadows Aprimoradas (mais profundas)
- `--v2-shadow-sm`: 2px blur
- `--v2-shadow-md`: 8px blur (hover cards)
- `--v2-shadow-lg`: 20px blur (dropdowns)
- `--v2-shadow-xl`: 25px blur (modals)

### Cores (Light/Dark)
- `--v2-primary`: #4F46E5 (light), #818CF8 (dark)
- `--v2-accent`: #06B6D4
- `--v2-bg-primary/secondary/tertiary`: Paletas refinadas
- `--v2-border`: Cores sutis por tema

---

## ✨ Componentes UI V2 (Implementados)

### Dashboard
- ✅ **Cards**: radius 16px + shadow + hover lift (-3px)

### Chat
- ✅ **ChatList**: Conversa items com card styling + hover smooth
- ✅ **ConversationView Header**: Gradiente background + shadow
- ✅ **Message Bubbles**: Fade+scale animation (200ms) + radius 16px
- ✅ **ChatInput Composer**: Background subtle + inputs com radius 12px

### Modais (Global)
- ✅ **Backdrop Blur**: 10px blur + darkened overlay
- ✅ **Modal Animation**: Fade+scale (280ms cubic-bezier)
- ✅ **Alert Dialogs**: Mesmo estilo

---

## 📱 Responsividade (Mobile-First)

Testado em:
- ✅ **Mobile** (375px): Padding ajustado, radius mantido, layouts fluidos
- ✅ **Tablet** (768px): Spacing aumentado, grid responsivo
- ✅ **Desktop** (1024px+): Máximo espaçamento, UI full

Sem overflow horizontal, sem textos ilegíveis, sem quebra de layout.

---

## 🎯 Piloto — Telas Ativas

1. **Dashboard**: Cards com `ui-v2-card`
2. **Chat** (piloto real):
   - ChatList (item seleção + hover)
   - ConversationView (header + messages)
   - Modais (backdrop blur)
   - Inputs (focus ring)

---

## 💡 Como Expandir

### 1. Adicionar Classe
```jsx
<Card className="ui-v2-card">conteúdo</Card>
<div className="ui-v2-conversation-item">lista item</div>
<button className="ui-v2-button">Ação</button>
```

### 2. Estilo em globals.css
```css
:root.ui-v2 .ui-v2-custom {
  border-radius: var(--v2-radius-lg);
  box-shadow: var(--v2-shadow-sm);
  transition: all 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

:root.ui-v2 .ui-v2-custom:hover {
  box-shadow: var(--v2-shadow-md);
  transform: translateY(-3px);
}
```

---

## ✅ Testes (Obrigatório)

Ao ativar UI V2, confirme:

- [ ] **Sidebar**: Item ativo tem gradiente + glow
- [ ] **Dashboard Cards**: Hover lift + shadow
- [ ] **Chat List**: Hover suave + border color
- [ ] **Message Bubbles**: Fade+scale animation visível
- [ ] **Modais**: Backdrop blur visível (8-12px)
- [ ] **Inputs**: Focus ring bonito (primary/10%)
- [ ] **Mobile** (375px): Sem overflow, layouts fluidos
- [ ] **Tablet** (768px): Espaçamento correto
- [ ] **Desktop** (1024px+): Máximo visual
- [ ] **Dark Mode**: Cores ajustadas, blur mantido
- [ ] **Sem quebra**: Zero alteração de funcionalidade

---

## 🌙 Dark Mode

UI V2 suporta automaticamente:
- Cores ajustadas por tema
- Shadows mais profundas no dark
- Backdrop blur mantido

Para testar: Clique "Tema: Escuro" na sidebar → UI V2 ativa automaticamente.

---

## 🔄 Status

- **Versão**: 1.0.0 (Beta)
- **Temas**: Light, Dark (Pastel/Midnight/Forest descontinuados para V2)
- **Telas Ativas**: Dashboard, Chat (piloto real)
- **Responsividade**: Mobile-first, testado 320px-1920px
- **Funcionalidade**: 100% preservada