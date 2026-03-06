import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversation_id, limit, before_date } = body;
    
    if (!conversation_id) {
      return Response.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    // Verify user has access to this conversation
    const conversations = await base44.asServiceRole.entities.ChatConversation.filter({ id: conversation_id });
    
    if (conversations.length === 0) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = conversations[0];
    const hasAccess = conv.participants?.includes(user.email) || 
                      (conv.type === "group" && conv.is_public === true);

    if (!hasAccess) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get messages for this conversation, sorted by created_date ascending
    const allMessages = await base44.asServiceRole.entities.ChatMessage.filter(
      { conversation_id },
      'created_date'
    );

    let messages = allMessages;

    // If before_date is provided, filter messages before that date (for pagination / loading older)
    if (before_date) {
      messages = allMessages.filter(m => m.created_date < before_date);
    }

    // If limit is provided, return only the last N messages
    const pageSize = limit || 0;
    const hasMore = pageSize > 0 && messages.length > pageSize;
    
    if (pageSize > 0 && messages.length > pageSize) {
      messages = messages.slice(-pageSize);
    }

    return Response.json({ 
      messages,
      has_more: hasMore,
      total: allMessages.length
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});