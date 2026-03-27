import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { comment_id, fb_comment_id, comment_text, post_context, auto_post, page_access_token } = await req.json();

    // Generate AI reply
    const reply = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت مسوق عربي محترف. اكتب رداً طبيعياً ومناسباً على هذا التعليق في وسائل التواصل الاجتماعي:

التعليق: "${comment_text}"
${post_context ? `سياق المنشور: "${post_context}"` : ''}

الرد يجب أن يكون:
- قصير وطبيعي (جملة أو جملتين كحد أقصى)
- لا يبدو آلياً أو متكرراً
- يعالج موضوع التعليق مباشرة
- إذا كان سؤالاً، أجب عليه أو اطلب من الشخص التواصل للاستفسار
- بالعربية العامية البسيطة`,
    });

    const replyText = typeof reply === 'string' ? reply : (reply?.text || '');

    if (auto_post && fb_comment_id) {
      const connections = await base44.entities.FacebookConnection.filter({});
      if (connections.length && connections[0].is_connected) {
        const token = page_access_token || connections[0].access_token;
        const postRes = await fetch(`https://graph.facebook.com/v18.0/${fb_comment_id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: replyText, access_token: token })
        });
        const postData = await postRes.json();

        if (!postData.error && comment_id) {
          await base44.entities.Comment.update(comment_id, { status: 'replied', auto_reply: replyText });
        }

        return Response.json({ success: true, reply: replyText, posted: !postData.error, fb_error: postData.error?.message });
      }
    }

    if (comment_id) {
      await base44.entities.Comment.update(comment_id, { auto_reply: replyText });
    }

    return Response.json({ success: true, reply: replyText, posted: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});