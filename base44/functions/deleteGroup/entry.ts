import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id } = await req.json();
    
    if (!conversation_id) {
      return Response.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    const conversations = await base44.asServiceRole.entities.ChatConversation.filter({ id: conversation_id });
    
    if (conversations.length === 0) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = conversations[0];
    
    // Permission check:
    // - Groups: only admins can delete
    // - Direct/self: any participant can delete
    const isParticipant = conv.participants?.includes(user.email);
    const isGroupAdmin = conv.type === "group" && conv.admins?.includes(user.email);
    const isAppAdmin = user.role === "admin";

    if (conv.type === "group" && !isGroupAdmin && !isAppAdmin) {
      return Response.json({ error: 'Only group admins can delete the group' }, { status: 403 });
    }

    if (conv.type !== "group" && !isParticipant && !isAppAdmin) {
      return Response.json({ error: 'Only participants can delete this conversation' }, { status: 403 });
    }

    // Delete all messages in batches
    let hasMore = true;
    while (hasMore) {
      const messages = await base44.asServiceRole.entities.ChatMessage.filter({ conversation_id }, '-created_date', 50);
      if (messages.length === 0) {
        hasMore = false;
        break;
      }
      for (const msg of messages) {
        await base44.asServiceRole.entities.ChatMessage.delete(msg.id);
      }
    }

    // Delete the conversation
    await base44.asServiceRole.entities.ChatConversation.delete(conversation_id);

    return Response.json({ success: true, type: conv.type });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});