# Guia de Integração - "Ler Depois" no Chat

Este guia descreve como integrar a funcionalidade "Ler Depois" ao `pages/Chat.jsx`.

## 1. Entidades Criadas

- `entities/ReadLaterConversation.json` - Marca conversas para ler depois
- `entities/ReadLaterMessage.json` - Marca mensagens para ler depois

## 2. Componentes e Hooks

### Hooks
- **`useReadLater(userEmail)`** - Gerencia estado de "Ler Depois"
  - Carrega dados do BD
  - Fornece métodos: `toggleConversationReadLater()`, `toggleMessageReadLater()`, `markConversationDone()`, `markMessageDone()`
  
- **`useReadLaterIntegration(userEmail)`** - Wrapper para integração com Chat
  - Fornece: `handleMessageReadLater()`, `handleConversationReadLater()`, `filterConversationsByReadLater()`

### Componentes UI
- **`ReadLaterPanel`** - Modal mostrando conversas e mensagens marcadas
  - Props: `open`, `onClose`, `readLaterConversations`, `readLaterMessages`, `conversations`, `messages`, callbacks
  
- **`ReadLaterBadge`** - Badge visual nas conversas
  - Props: `isReadLater`, `className`
  
- **`ConversationContextMenu`** - Menu de contexto com opção "Ler Depois"
  - Props: `conversation`, `isReadLater`, `onReadLater`, etc.
  
- **`ChatListFilters`** - Filtros de conversa (Todas / Ler Depois)
  - Props: `filter`, `onFilterChange`, `readLaterCount`

## 3. Steps para Integrar ao Chat.jsx

### 3.1 Import dos Hooks e Componentes

```javascript
import { useReadLaterIntegration } from "@/components/chat/useReadLaterIntegration";
import ReadLaterPanel from "@/components/chat/ReadLaterPanel";
import { ChatListFilters } from "@/components/chat/ChatListFilters";
import { ReadLaterBadge } from "@/components/chat/ReadLaterBadge";
import { ConversationContextMenu } from "@/components/chat/ConversationContextMenu";
```

### 3.2 State no Chat.jsx

```javascript
// No componente Chat:
const readLater = useReadLaterIntegration(user?.email);
const [showReadLaterPanel, setShowReadLaterPanel] = useState(false);
const [conversationFilter, setConversationFilter] = useState("all"); // "all" | "read_later"
```

### 3.3 Filtrar Conversas

```javascript
// Após carregar conversas
let displayConversations = conversations;
if (conversationFilter === "read_later") {
  displayConversations = readLater.filterConversationsByReadLater(conversations);
}
```

### 3.4 No ChatList - Adicionar Filtro

```jsx
// Antes da lista de conversas (em Desktop)
<ChatListFilters
  filter={conversationFilter}
  onFilterChange={setConversationFilter}
  readLaterCount={readLater.readLaterConversations.length}
/>

// Passar ao ChatList o filtro
<ChatList
  conversations={displayConversations}
  // ... outros props ...
/>
```

### 3.5 No ChatList - Integrar Menu de Contexto

Na renderização de cada conversa em ChatList, substituir o botão de pin/menu:

```jsx
// ANTES:
<button onClick={(e) => handlePinToggle(e, conv)} ...>

// DEPOIS:
<ConversationContextMenu
  conversation={conv}
  isPinned={isPinned}
  isReadLater={readLater.isConversationReadLater(conv.id)}
  currentUser={currentUser}
  onPin={(shouldPin) => onPinConversation?.(conv, shouldPin)}
  onReadLater={() => readLater.handleConversationReadLater(conv.id)}
  onCopy={() => toast({ title: "ID copiado" })}
  trigger={
    <button onClick={(e) => e.stopPropagation()} ...>
      <MoreVertical className="w-4 h-4" />
    </button>
  }
/>
```

### 3.6 No MessageBubble - Adicionar Callback

```jsx
<MessageBubble
  message={message}
  // ... outros props ...
  onReadLater={(msg) => readLater.handleMessageReadLater(msg)}
  isReadLater={readLater.isMessageReadLater(message.id)}
/>
```

### 3.7 Adicionar Botão para Abrir ReadLaterPanel

No header do Chat (próximo ao botão de Presença Settings):

```jsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => setShowReadLaterPanel(true)}
  title="Minhas leituras pendentes"
  className="relative"
>
  <Bookmark className="w-4 h-4" />
  {(readLater.readLaterConversations.length + readLater.readLaterMessages.length) > 0 && (
    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
      {readLater.readLaterConversations.length + readLater.readLaterMessages.length}
    </Badge>
  )}
</Button>
```

### 3.8 Renderizar ReadLaterPanel

```jsx
<ReadLaterPanel
  open={showReadLaterPanel}
  onClose={() => setShowReadLaterPanel(false)}
  readLaterConversations={readLater.readLaterConversations}
  readLaterMessages={readLater.readLaterMessages}
  conversations={conversations}
  messages={allMessages} // precisa estar disponível no state
  onConversationClick={(convId) => {
    onSelectConversation(conversations.find(c => c.id === convId));
  }}
  onMessageClick={(convId, msgId) => {
    onSelectConversation(conversations.find(c => c.id === convId));
    // O ConversationView fará scroll até a mensagem
    setTimeout(() => {
      const msgEl = document.getElementById(`message-${msgId}`);
      msgEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }}
  onMarkConversationDone={readLater.markConversationDone}
  onMarkMessageDone={readLater.markMessageDone}
  onRemoveConversation={readLater.toggleConversationReadLater}
  onRemoveMessage={readLater.toggleMessageReadLater}
/>
```

### 3.9 Adicionar id aos elementos de mensagem (para scroll)

No ConversationView, ao renderizar MessageBubble:

```jsx
<div id={`message-${message.id}`} key={message.id}>
  <MessageBubble ... />
</div>
```

## 4. Comportamento Esperado

✅ Usuário clica "Ler depois" na conversa → salva em BD, badge aparece
✅ Usuário clica "Ler depois" em mensagem → salva em BD
✅ Filtro "Ler Depois" mostra só conversas marcadas
✅ Painel "Minhas Leituras Pendentes" lista tudo
✅ Ao clicar em mensagem no painel → abre conversa e faz scroll
✅ Marcar como "feito" remove da lista imediatamente
✅ Sem refresh completo necessário (UI reativa)
✅ Dados persistem entre sessões
✅ Cada usuário vê seus próprios dados

## 5. Notas de Implementação

- `useReadLater` carrega dados ao montar e sincroniza com BD
- Estados são atualizados imediatamente na UI (otimismo)
- Conversas/mensagens deletadas não afetam registros "Ler Depois"
- Não altera unread count, read receipts ou notificações
- Totalmente isolado por user_email

## 6. Mobile Responsividade

- ChatListFilters usa `flex-wrap md:flex-nowrap` para adaptar
- ReadLaterPanel ocupa quase toda tela em mobile (max-h-[85vh])
- ConversationContextMenu usa DropdownMenu (responsivo automaticamente)
- ScrollArea em ReadLaterPanel mantém conteúdo acessível