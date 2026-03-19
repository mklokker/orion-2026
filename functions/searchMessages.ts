import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Busca mensagens dentro de uma conversa
 * Retorna resultados paginados com destaque do termo
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id, query, page = 1, limit = 20, filter_type = "all" } = await req.json();

    if (!conversation_id || !query || query.trim().length === 0) {
      return Response.json({ error: 'conversation_id and query are required' }, { status: 400 });
    }

    // Verificar que o usuário faz parte da conversa
    const conversation = await base44.entities.ChatConversation.filter({ id: conversation_id });
    if (!conversation || conversation.length === 0 || !conversation[0].participants?.includes(user.email)) {
      return Response.json({ error: 'Not authorized to search this conversation' }, { status: 403 });
    }

    // Buscar todas as mensagens (sem paginação no backend, deixa a paginação para frontend)
    const allMessages = await base44.entities.ChatMessage.filter({
      conversation_id: conversation_id,
      is_deleted: false
    });

    // Filtrar por tipo
    let filtered = allMessages;
    if (filter_type === "files") {
      filtered = filtered.filter(m => m.type === "file" || m.type === "image");
    } else if (filter_type === "links") {
      filtered = filtered.filter(m => m.type === "text" && m.content?.includes("http"));
    }

    // Buscar case-insensitive
    const lowerQuery = query.toLowerCase();
    const results = filtered.filter(m => 
      m.content?.toLowerCase().includes(lowerQuery) ||
      m.file_name?.toLowerCase().includes(lowerQuery)
    );

    // Ordenar por data (mais recente primeiro)
    results.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    // Paginar
    const offset = (page - 1) * limit;
    const paginatedResults = results.slice(offset, offset + limit);

    // Adicionar highlight do termo
    const withHighlight = paginatedResults.map(msg => ({
      ...msg,
      highlight_indices: msg.content ? getHighlightIndices(msg.content, query) : []
    }));

    return Response.json({
      results: withHighlight,
      total: results.length,
      page,
      limit,
      has_more: offset + limit < results.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Encontra os índices de todas as ocorrências da query no texto
 * para facilitar highlight no frontend
 */
function getHighlightIndices(text, query) {
  const indices = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let index = 0;

  while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
    indices.push({ start: index, end: index + lowerQuery.length });
    index += lowerQuery.length;
  }

  return indices;
}