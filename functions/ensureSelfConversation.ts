import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Garante que o usuário tem uma conversa "self" (Anotações)
 * Cria automaticamente se não existir
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Procurar conversa self existente do usuário
    const existing = await base44.entities.ChatConversation.filter({
      type: "self",
      participants: user.email
    });

    if (existing && existing.length > 0) {
      return Response.json({ conversation: existing[0] });
    }

    // Criar nova conversa self
    const selfConversation = await base44.entities.ChatConversation.create({
      type: "self",
      name: "Anotações",
      participants: [user.email],
      is_pinned_by: [user.email] // Auto-fixar no topo
    });

    return Response.json({ conversation: selfConversation });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});