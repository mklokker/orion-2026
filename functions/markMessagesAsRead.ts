import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Marks all unread messages in a conversation as read for the current user.
 * Done server-side with service role to avoid rate limits.
 */
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

    const userEmail = user.email;
    const now = new Date().toISOString();

    // Get all messages in the conversation
    const messages = await base44.asServiceRole.entities.ChatMessage.filter(
      { conversation_id },
      'created_date'
    );

    let markedCount = 0;

    for (const msg of messages) {
      // Skip own messages and deleted messages
      if (msg.sender_email === userEmail) continue;
      if (msg.is_deleted) continue;

      const readByArray = Array.isArray(msg.read_by) ? msg.read_by : [];
      const alreadyRead = readByArray.some(r => r && r.email === userEmail);

      if (!alreadyRead) {
        const newReadBy = [...readByArray, { email: userEmail, read_at: now }];
        await base44.asServiceRole.entities.ChatMessage.update(msg.id, { read_by: newReadBy });
        markedCount++;
      }
    }

    console.log(`[markMessagesAsRead] Marked ${markedCount} messages as read for ${userEmail} in conversation ${conversation_id}`);

    return Response.json({ success: true, marked: markedCount });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});