import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        const { conversation_id } = await req.json();

        if (!user || !conversation_id) {
            return Response.json({ error: 'Invalid request' }, { status: 400 });
        }

        // 1. Get unread messages in this conversation
        // We assume reasonable limit (e.g. last 50 messages) to avoid massive operations
        const messages = await base44.entities.ChatMessage.filter(
            { conversation_id: conversation_id },
            '-created_date',
            50
        );

        const unreadMessages = messages.filter(msg => 
            msg.sender_email !== user.email && 
            !msg.read_by?.includes(user.email)
        );

        if (unreadMessages.length === 0) {
            return Response.json({ count: 0 });
        }

        // 2. Update them in parallel
        await Promise.all(unreadMessages.map(msg => {
            const newReadBy = [...(msg.read_by || []), user.email];
            // Use unique set
            const uniqueReadBy = [...new Set(newReadBy)];
            return base44.entities.ChatMessage.update(msg.id, { read_by: uniqueReadBy });
        }));

        return Response.json({ count: unreadMessages.length });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});