import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date().toISOString();

    // Get all scheduled posts
    const posts = await base44.asServiceRole.entities.Post.filter({ status: 'scheduled' });
    const duePosts = posts.filter(p => p.scheduled_at && p.scheduled_at <= now);

    let processed = 0;
    for (const post of duePosts) {
      // Activate associated campaigns
      const campaigns = await base44.asServiceRole.entities.Campaign.filter({ post_id: post.id });
      for (const campaign of campaigns) {
        if (campaign.status === 'draft') {
          await base44.asServiceRole.entities.Campaign.update(campaign.id, {
            status: 'active',
            started_at: new Date().toISOString()
          });
        }
      }

      // Update post status to publishing
      await base44.asServiceRole.entities.Post.update(post.id, { status: 'publishing' });
      processed++;
    }

    return Response.json({ success: true, processed, total_scheduled: posts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});