import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Returns unread message counts for all conversations the user participates in.
 * This is done server-side with service role to avoid rate limits and ensure accuracy.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;

    // Get all conversations user participates in
    const allConversations = await base44.asServiceRole.entities.ChatConversation.filter({});
    const myConversations = allConversations.filter(c => 
      c.participants?.includes(userEmail)
    );

    const counts = {};

    // For each conversation, count unread messages
    for (const conv of myConversations) {
      try {
        const messages = await base44.asServiceRole.entities.ChatMessage.filter(
          { conversation_id: conv.id }
        );

        let unread = 0;
        for (const msg of messages) {
          // Skip own messages
          if (msg.sender_email === userEmail) continue;
          // Skip deleted messages
          if (msg.is_deleted) continue;
          // Check if read_by contains the user
          const rawReadBy = msg.read_by || [];
          // Handle corrupted data: some entries may be plain strings instead of objects
          const isRead = rawReadBy.some(r => {
            if (typeof r === 'string') return r === userEmail;
            return r && r.email === userEmail;
          });
          if (!isRead) {
            unread++;
          }
        }

        if (unread > 0) {
          counts[conv.id] = unread;
        }
      } catch (e) {
        console.error(`Error counting unread for conv ${conv.id}:`, e.message);
      }
    }

    return Response.json({ counts });
  } catch (error) {
    console.error("Error in getUnreadCounts:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});