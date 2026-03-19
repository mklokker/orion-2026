import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to list all users (bypasses role restrictions)
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Return only public info needed for chat
    const publicUsers = allUsers.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      display_name: u.display_name,
      profile_picture: u.profile_picture,
      role: u.role
    }));

    return Response.json({ users: publicUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});