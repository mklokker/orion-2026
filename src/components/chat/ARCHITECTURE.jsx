# Arquitetura: "Ler Depois"

## Fluxo de Dados

```
┌─────────────────┐
│  MessageBubble  │  (UI - Mensagem)
│   - onReadLater │
│   - isReadLater │
└────────┬────────┘
         │ callback: handleMessageReadLater(message)
         ▼
┌──────────────────────────────┐
│ useReadLaterIntegration      │  (Wrapper/Integration Hook)
│  - handleMessageReadLater()  │
│  - handleConversationReadLater()
│  - filterConversationsByReadLater()
└────────┬─────────────────────┘
         │ delegado para:
         ▼
┌──────────────────────────────┐
│ useReadLater(userEmail)      │  (Core Logic Hook)
│ - toggleMessageReadLater()   │
│ - toggleConversationReadLater()
│ - markMessageDone()          │
│ - markConversationDone()     │
│ - isMessageReadLater()       │
│ - isConversationReadLater()  │
└────────┬─────────────────────┘
         │ CRUD operations
         ▼
┌──────────────────────────┐
│ ReadLaterMessage entity  │  (Database)
│ ReadLaterConversation    │
│ (user_email, status)     │
└──────────────────────────┘
```

## Component Tree

```
Chat.jsx
├── ChatListFilters (filtro: all | read_later)
│   └── onFilterChange → setConversationFilter
│
├── ChatList (conversas filtradas)
│   ├── ConversationContextMenu
│   │   ├── onReadLater → readLater.handleConversationReadLater()
│   │   └── Exibe: isReadLater
│   │
│   └── ReadLaterBadge (visual indicator)
│
├── ConversationView
│   └── MessageBubble (para cada msg)
│       ├── onReadLater → readLater.handleMessageReadLater()
│       └── isReadLater → ícone no menu
│
└── ReadLaterPanel (modal)
    ├── Abas: Conversas | Mensagens
    ├── Lista com checkboxes
    └── Ações: Marcar feito, Remover, Em lote
```

## Estado Management

```javascript
// Em Chat.jsx:
const readLater = useReadLaterIntegration(user?.email);
// ├─ readLater.readLaterConversations : Array<Record>
// ├─ readLater.readLaterMessages : Array<Record>
// ├─ readLater.isConversationReadLater(id) : boolean
// ├─ readLater.isMessageReadLater(id) : boolean
// ├─ readLater.handleConversationReadLater(id) : Promise
// ├─ readLater.handleMessageReadLater(msg) : Promise
// └─ readLater.reloadData() : Promise

const [conversationFilter, setConversationFilter] = useState("all");
const [showReadLaterPanel, setShowReadLaterPanel] = useState(false);

// Computed:
const displayConversations = conversationFilter === "read_later" 
  ? readLater.filterConversationsByReadLater(conversations)
  : conversations;
```

## Database Schema

### ReadLaterConversation
```json
{
  "id": "uuid",
  "user_email": "user@example.com",
  "conversation_id": "conv-id",
  "status": "active | done",
  "created_date": "2024-01-01T00:00:00Z",
  "updated_date": "2024-01-01T00:00:00Z"
}
```

**Constraints:**
- Primary: id
- Unique: (user_email, conversation_id, status='active')
- Index: user_email + status

### ReadLaterMessage
```json
{
  "id": "uuid",
  "user_email": "user@example.com",
  "message_id": "msg-id",
  "conversation_id": "conv-id",
  "status": "active | done",
  "created_date": "2024-01-01T00:00:00Z",
  "updated_date": "2024-01-01T00:00:00Z"
}
```

**Constraints:**
- Primary: id
- Unique: (user_email, message_id, status='active')
- Index: user_email + status

## Fluxos de Interação

### 1. Usuário marca conversa para ler depois
```
User clicks "Ler depois" in ConversationContextMenu
       ↓
onReadLater() callback fired
       ↓
readLater.handleConversationReadLater(convId)
       ↓
readLater.toggleConversationReadLater(convId)
       ↓
Check if exists: readLaterConversations.find(r => r.conversation_id === convId)
       ├─ Exists: DELETE from DB
       └─ Not exists: CREATE in DB
       ↓
UI state updated immediately
       ↓
ReadLaterBadge appears / disappears
```

### 2. Usuário abre painel de leituras
```
User clicks Bookmark icon in header
       ↓
setShowReadLaterPanel(true)
       ↓
ReadLaterPanel renders with data
       ├─ readLater.readLaterConversations
       └─ readLater.readLaterMessages
       ↓
User clicks conversation in panel
       ↓
onConversationClick(convId) callback
       ↓
setSelectedConversation(conv)
setShowReadLaterPanel(false)
       ↓
ConversationView opens
```

### 3. Usuário marca mensagem como feita
```
User clicks "✓ Marcar como lido" in panel
       ↓
onMarkMessageDone(messageId)
       ↓
readLater.markMessageDone(messageId)
       ↓
UPDATE ReadLaterMessage SET status='done' WHERE message_id=?
       ↓
Remove from readLaterMessages state
       ↓
UI refreshes automatically
```

### 4. Filtro "Ler Depois"
```
User clicks "Ler Depois" tab in ChatListFilters
       ↓
setConversationFilter("read_later")
       ↓
displayConversations = readLater.filterConversationsByReadLater(conversations)
       ↓
ChatList re-renders with filtered list
       ↓
Only conversations in readLater.readLaterConversations appear
```

## Performance Considerations

1. **Initial Load**
   - `useReadLater` fetches data on mount
   - Parallel queries for conversations + messages
   - Data cached in component state

2. **Filtering**
   - Client-side filtering (JavaScript .filter())
   - No additional DB calls
   - Fast for reasonable conversation counts (<1000)

3. **Mutations**
   - Optimistic UI update (setState before DB)
   - DB mutation happens async
   - Fallback: reloadData() on error

4. **Scroll to Message**
   - getElementById by message id
   - ScrollIntoView with smooth behavior
   - 300ms delay to ensure DOM rendered

## Testing Checklist

- [ ] Mark conversation → badge appears
- [ ] Filter "Ler Depois" → shows only marked
- [ ] Open panel → lists conversations + messages
- [ ] Click conversation in panel → opens + closes panel
- [ ] Click message in panel → opens + scrolls
- [ ] Mark as done → removed from list
- [ ] Remove → deleted from DB
- [ ] Multi-select → bulk actions work
- [ ] Another user → doesn't see other's data
- [ ] Refresh → data persists
- [ ] Mobile → all responsive
- [ ] No unread/notification changes