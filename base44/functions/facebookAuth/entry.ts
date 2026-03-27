import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const APP_ID = Deno.env.get("FACEBOOK_APP_ID");
const APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, code, redirect_uri } = body;

    if (action === 'get_auth_url') {
      const params = new URLSearchParams({
        client_id: APP_ID,
        redirect_uri,
        scope: 'public_profile,email',
        response_type: 'code',
      });
      return Response.json({
        auth_url: `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
      });
    }

    if (action === 'exchange_token') {
      const tokenRes = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${APP_SECRET}&code=${code}`
      );
      const tokenData = await tokenRes.json();
      if (tokenData.error) return Response.json({ error: tokenData.error.message }, { status: 400 });

      // Get long-lived token
      const longRes = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
      );
      const longData = await longRes.json();
      const finalToken = longData.access_token || tokenData.access_token;

      const [meRes, pagesRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${finalToken}`),
        fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category&access_token=${finalToken}`)
      ]);
      const meData = await meRes.json();
      const pagesData = await pagesRes.json();

      const connectionData = {
        user_id: meData.id,
        name: meData.name,
        access_token: finalToken,
        pages: pagesData.data || [],
        is_connected: true
      };

      const existing = await base44.entities.FacebookConnection.filter({});
      if (existing.length > 0) {
        await base44.entities.FacebookConnection.update(existing[0].id, connectionData);
      } else {
        await base44.entities.FacebookConnection.create(connectionData);
      }

      return Response.json({ success: true, name: meData.name, pages: pagesData.data || [] });
    }

    if (action === 'disconnect') {
      const existing = await base44.entities.FacebookConnection.filter({});
      if (existing.length > 0) {
        await base44.entities.FacebookConnection.update(existing[0].id, { is_connected: false, access_token: '' });
      }
      return Response.json({ success: true });
    }

    if (action === 'get_status') {
      const existing = await base44.entities.FacebookConnection.filter({});
      if (existing.length > 0 && existing[0].is_connected) {
        return Response.json({ connected: true, name: existing[0].name, pages: existing[0].pages || [] });
      }
      return Response.json({ connected: false });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});