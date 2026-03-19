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

    // SECURITY: Verify user is a participant of this conversation
    const convs = await base44.asServiceRole.entities.ChatConversation.filter({ id: conversation_id });
    if (convs.length === 0) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }
    const conv = convs[0];
    const hasAccess = conv.participants?.includes(userEmail) || 
                      (conv.type === "group" && conv.is_public === true);
    if (!hasAccess) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

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

      const rawReadBy = Array.isArray(msg.read_by) ? msg.read_by : [];
      
      // Sanitize read_by: convert any plain strings to proper objects
      // Some old records may have emails as strings instead of {email, read_at}
      const sanitizedReadBy = rawReadBy.map(entry => {
        if (typeof entry === 'string') {
          return { email: entry, read_at: now };
        }
        if (entry && typeof entry === 'object' && entry.email) {
          return entry;
        }
        return null;
      }).filter(Boolean);

      const alreadyRead = sanitizedReadBy.some(r => r.email === userEmail);

      if (!alreadyRead) {
        const newReadBy = [...sanitizedReadBy, { email: userEmail, read_at: now }];
        await base44.asServiceRole.entities.ChatMessage.update(msg.id, { read_by: newReadBy });
        markedCount++;
      } else if (sanitizedReadBy.length !== rawReadBy.length) {
        // Even if already read, fix corrupted data
        await base44.asServiceRole.entities.ChatMessage.update(msg.id, { read_by: sanitizedReadBy });
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