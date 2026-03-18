import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Verifica se o usuário está autenticado
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Usa service role para listar todos os usuários (sem restrição de permissão)
        const users = await base44.asServiceRole.entities.User.list();

        return Response.json({ users });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});