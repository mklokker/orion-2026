import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Busca mensagens em TODAS as conversas do usuário atual que contenham o termo.
 * Retorna as conversation_ids onde o termo foi encontrado.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();

    if (!query || query.trim().length < 2) {
      return Response.json({ conversation_ids: [], total: 0 });
    }

    const lowerQuery = query.trim().toLowerCase();

    // Buscar todas as conversas do usuário
    const allConversations = await base44.asServiceRole.entities.ChatConversation.list();
    const myConversations = allConversations.filter(c => 
      c.participants?.includes(user.email)
    );

    const myConvIds = myConversations.map(c => c.id);

    if (myConvIds.length === 0) {
      return Response.json({ conversation_ids: [], total: 0 });
    }

    // Buscar mensagens em lotes para não sobrecarregar
    const matchingConvIds = new Set();

    // Processar em blocos de 10 conversas por vez
    const chunkSize = 10;
    for (let i = 0; i < myConvIds.length; i += chunkSize) {
      const chunk = myConvIds.slice(i, i + chunkSize);

      await Promise.all(chunk.map(async (convId) => {
        try {
          const messages = await base44.asServiceRole.entities.ChatMessage.filter({
            conversation_id: convId,
            is_deleted: false
          });

          const hasMatch = messages.some(m =>
            m.content?.toLowerCase().includes(lowerQuery) ||
            m.file_name?.toLowerCase().includes(lowerQuery)
          );

          if (hasMatch) {
            matchingConvIds.add(convId);
          }
        } catch (err) {
          // ignora erro de conversas individuais
        }
      }));
    }

    return Response.json({
      conversation_ids: Array.from(matchingConvIds),
      total: matchingConvIds.size
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});