# Orion UI V2 — Preview Mode Guide

## 📋 Overview

Orion UI V2 é um redesign completo com novos tokens, componentes atualizados e microinterações premium. Status: **Beta/Piloto** em 2 telas (Dashboard, Chat).

---

## 🚀 Como Ativar/Desativar

### Via Sidebar (Recomendado)
1. Procure "UI V2 ✓" no footer da sidebar (apenas expandida)
2. Clique para ativar/desativar
3. Preferência salva em localStorage automaticamente

### Via Console (Manual)
```javascript
localStorage.setItem("orion-ui-v2-enabled", "true");
window.location.reload();
```

---

## 📁 Arquivos Criados/Alterados

| Arquivo | Alteração |
|---------|-----------|
| `globals.css` | ✅ Novos tokens, estilos base, keyframes |
| `components/ui/useUIv2Preview.js` | ✅ Hook para gerenciar estado |
| `layout.js` | ✅ Importa hook, adiciona toggle |
| `pages/Dashboard` | ✅ Adiciona `ui-v2-card` aos Cards |

---

## 🎨 Design Tokens (V2)

### Cores (Light/Dark já suportadas)
- `--v2-primary`: Indigo (#4F46E5 light, #818CF8 dark)
- `--v2-accent`: Cyan (#06B6D4)
- `--v2-success`: Green (#10B981)
- `--v2-error`: Red (#EF4444 light, #F87171 dark)

### Shadows
- `--v2-shadow-sm`: Sutil
- `--v2-shadow-md`: Padrão
- `--v2-shadow-lg`: Alto

### Radius
- `--v2-radius-md`: 10px (inputs, buttons)
- `--v2-radius-lg`: 14px (cards, modals)

---

## ✨ Microinterações

- **Cards**: Hover → translateY(-2px) + shadow elevada
- **Modais**: Fade + scale (cubic-bezier ease-out)
- **Dropdowns**: Slide-in (200ms)
- **Buttons**: Elevação no hover com shadow
- **Respeita**: `prefers-reduced-motion` do SO

---

## 🎯 Piloto — Telas Ativas

Apenas **2 telas** com UI V2 ativo:
1. **Dashboard**: Cards com `ui-v2-card`
2. **Chat**: Próxima iteração

---

## 💡 Como Expandir

### 1. Adicionar Classe
```jsx
<Card className="ui-v2-card">content</Card>
<Button className="ui-v2-button ui-v2-button-primary">Click</Button>
```

### 2. Adicionar Estilo em globals.css
```css
:root.ui-v2 .ui-v2-custom {
  background: var(--v2-bg-primary);
  border-radius: var(--v2-radius-lg);
  transition: all 250ms cubic-bezier(0.22, 1, 0.36, 1);
}
```

---

## ✅ Testes Recomendados

- [ ] Toggle aparece e funciona
- [ ] localStorage persiste (reload mantém estado)
- [ ] Estilos mudam ao ativar/desativar
- [ ] Light & Dark modes funcionam
- [ ] Sem quebra de funcionalidade
- [ ] Responsivo (mobile/tablet/desktop)

---

## 🔄 Status

- **Versão**: 1.0.0 (Beta)
- **Temas**: Light, Dark only
- **Telas**: Dashboard, Chat (piloto)
- **Próximas**: Expandir para mais telas gradualmente