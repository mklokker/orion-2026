import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to list all conversations
    const allConversations = await base44.asServiceRole.entities.ChatConversation.list('-last_message_at');
    
    // Filter: user is participant OR group is public
    const userConversations = allConversations.filter(conv => 
      conv.participants?.includes(user.email) || 
      (conv.type === "group" && conv.is_public === true)
    );

    return Response.json({ conversations: userConversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});