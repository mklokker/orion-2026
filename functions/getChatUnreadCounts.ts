import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch active conversations (limit to 50 for performance)
        const conversations = await base44.entities.ChatConversation.list('-last_message_date', 50);
        
        const myConversations = conversations.filter(c => 
            c.participants?.includes(user.email) || 
            (c.conversation_type === 'group' && c.is_public) ||
            c.conversation_type === 'department'
        );

        let totalUnread = 0;
        const unreadByConversation = {};
        let latestMessageDate = null;
        let latestMessageBy = null;

        // Check unread for each conversation
        // We run this in parallel for speed
        await Promise.all(myConversations.map(async (conv) => {
            // Check global latest message for sound notification
            if (conv.last_message_date) {
                const convDate = new Date(conv.last_message_date).getTime();
                const currentLatest = latestMessageDate ? new Date(latestMessageDate).getTime() : 0;
                if (convDate > currentLatest) {
                    latestMessageDate = conv.last_message_date;
                    latestMessageBy = conv.last_message_by;
                }
            }

            // Optimization: Check if last message was sent by me, if so, likely no unread (unless others spoke after)
            // But to be sure, we fetch messages.
            // Fetch latest 20 messages
            const messages = await base44.entities.ChatMessage.filter(
                { conversation_id: conv.id },
                '-created_date',
                20
            );

            let convUnread = 0;
            for (const msg of messages) {
                if (msg.sender_email !== user.email && !msg.read_by?.includes(user.email)) {
                    convUnread++;
                } else {
                    // Once we hit a message read by us or sent by us, older ones are likely read too
                    // (Assuming linear reading)
                    break; 
                }
            }

            if (convUnread > 0) {
                unreadByConversation[conv.id] = convUnread;
                totalUnread += convUnread;
            }
        }));

        return Response.json({
            totalUnread,
            unreadByConversation,
            latestMessageDate,
            latestMessageBy
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});