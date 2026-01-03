import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id } = await req.json();
    
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

    // Get messages for this conversation
    const messages = await base44.asServiceRole.entities.ChatMessage.filter(
      { conversation_id },
      'created_date'
    );

    return Response.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});