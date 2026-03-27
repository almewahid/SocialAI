import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fb_post_id, post_id, page_access_token } = await req.json();

    const connections = await base44.entities.FacebookConnection.filter({});
    if (!connections.length || !connections[0].is_connected) {
      return Response.json({ error: 'Facebook not connected' }, { status: 400 });
    }

    const token = page_access_token || connections[0].access_token;

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${fb_post_id}/comments?fields=id,from,message,created_time,like_count&limit=100&order=ranked&access_token=${token}`
    );
    const data = await res.json();

    if (data.error) return Response.json({ error: data.error.message }, { status: 400 });

    const comments = data.data || [];
    const saved = [];

    const questionKeywords = ['كيف', 'ما هو', 'هل', 'أين', 'متى', 'لماذا', '?', '؟', 'سعر', 'تكلفة', 'كم'];
    const importantKeywords = ['مشكلة', 'شكوى', 'أريد', 'أبغى', 'محتاج', 'سعر', 'تكلفة', 'للبيع', 'شراء', 'تواصل'];
    const negativeKeywords = ['سيء', 'رديء', 'مشكلة', 'غلط', 'خطأ', 'احتيال', 'ناكل'];
    const positiveKeywords = ['ممتاز', 'رائع', 'شكراً', 'جميل', 'أحسنت', 'بارك', 'ماشاء الله', 'تمام'];

    for (const comment of comments) {
      const existing = await base44.entities.Comment.filter({ fb_comment_id: comment.id });
      if (existing.length > 0) {
        saved.push(existing[0]);
        continue;
      }

      const text = (comment.message || '').toLowerCase();
      const isQuestion = questionKeywords.some(k => text.includes(k.toLowerCase()));
      const isImportant = importantKeywords.some(k => text.includes(k.toLowerCase()));
      let sentiment = 'neutral';
      if (negativeKeywords.some(k => text.includes(k))) sentiment = 'negative';
      else if (positiveKeywords.some(k => text.includes(k))) sentiment = 'positive';

      const newComment = await base44.entities.Comment.create({
        post_id: post_id || '',
        fb_comment_id: comment.id,
        fb_post_id,
        author_name: comment.from?.name || 'مجهول',
        author_id: comment.from?.id || '',
        content: comment.message || '',
        timestamp: comment.created_time,
        status: isImportant ? 'important' : 'new',
        is_question: isQuestion,
        sentiment
      });
      saved.push(newComment);
    }

    return Response.json({ comments: saved, total: saved.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});