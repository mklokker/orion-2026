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

    // Get conversation and verify user is admin
    const conversations = await base44.asServiceRole.entities.ChatConversation.filter({ id: conversation_id });
    
    if (conversations.length === 0) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = conversations[0];
    
    // Only admins of the group can delete it
    if (!conv.admins?.includes(user.email)) {
      return Response.json({ error: 'Only group admins can delete the group' }, { status: 403 });
    }

    // Delete all messages first
    const messages = await base44.asServiceRole.entities.ChatMessage.filter({ conversation_id });
    for (const msg of messages) {
      await base44.asServiceRole.entities.ChatMessage.delete(msg.id);
    }

    // Delete the conversation
    await base44.asServiceRole.entities.ChatConversation.delete(conversation_id);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});