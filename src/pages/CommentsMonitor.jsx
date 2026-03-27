import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  MessageSquare, Facebook, Link2, RefreshCw,
  Wand2, Send, Star, Bell, Loader2, LogOut,
  ExternalLink, Check, AlertTriangle
} from "lucide-react";

export default function CommentsMonitor() {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [postUrl, setPostUrl] = useState("");
  const [fetchingComments, setFetchingComments] = useState(false);
  const [filter, setFilter] = useState("all");
  const [replyTexts, setReplyTexts] = useState({});
  const [generatingReply, setGeneratingReply] = useState({});
  const [sendingReply, setSendingReply] = useState({});
  const [selectedPage, setSelectedPage] = useState(null);
  const [connectingFB, setConnectingFB] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [statusRes, savedComments] = await Promise.all([
      base44.functions.invoke("facebookAuth", { action: "get_status" }),
      base44.entities.Comment.list("-created_date", 200)
    ]);
    if (statusRes.data?.connected) {
      setConnection(statusRes.data);
      if (statusRes.data.pages?.length > 0) setSelectedPage(statusRes.data.pages[0]);
    }
    setComments(savedComments);
    setLoading(false);
  };

  const connectFacebook = async () => {
    setConnectingFB(true);
    const redirect_uri = `${window.location.origin}${createPageUrl("FacebookCallback")}`;
    const res = await base44.functions.invoke("facebookAuth", { action: "get_auth_url", redirect_uri });
    if (res.data?.auth_url) window.location.href = res.data.auth_url;
    setConnectingFB(false);
  };

  const disconnect = async () => {
    await base44.functions.invoke("facebookAuth", { action: "disconnect" });
    setConnection(null);
  };

  const extractPostId = (url) => {
    const match = url.match(/\/posts\/(\d+)/);
    if (match) return match[1];
    if (/^\d+_\d+$/.test(url) || /^\d+$/.test(url)) return url;
    return url.trim();
  };

  const fetchComments = async () => {
    if (!postUrl.trim()) return;
    setFetchingComments(true);
    const res = await base44.functions.invoke("fetchComments", {
      fb_post_id: extractPostId(postUrl),
      page_access_token: selectedPage?.access_token
    });
    if (res.data?.comments) {
      const newIds = new Set(res.data.comments.map(c => c.id));
      setComments(prev => [...res.data.comments, ...prev.filter(c => !newIds.has(c.id))]);
    }
    setFetchingComments(false);
  };

  const generateReply = async (comment) => {
    setGeneratingReply(prev => ({ ...prev, [comment.id]: true }));
    const res = await base44.functions.invoke("generateReply", {
      comment_id: comment.id,
      fb_comment_id: comment.fb_comment_id,
      comment_text: comment.content,
      auto_post: false
    });
    if (res.data?.reply) {
      setReplyTexts(prev => ({ ...prev, [comment.id]: res.data.reply }));
    }
    setGeneratingReply(prev => ({ ...prev, [comment.id]: false }));
  };

  const sendReply = async (comment) => {
    const text = replyTexts[comment.id];
    if (!text?.trim()) return;
    setSendingReply(prev => ({ ...prev, [comment.id]: true }));
    const res = await base44.functions.invoke("generateReply", {
      comment_id: comment.id,
      fb_comment_id: comment.fb_comment_id,
      comment_text: text,
      auto_post: true,
      page_access_token: selectedPage?.access_token
    });
    if (res.data?.posted || res.data?.success) {
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, status: 'replied', auto_reply: text } : c));
      setReplyTexts(prev => { const n = { ...prev }; delete n[comment.id]; return n; });
    }
    setSendingReply(prev => ({ ...prev, [comment.id]: false }));
  };

  const toggleImportant = async (comment) => {
    const newStatus = comment.status === 'important' ? 'new' : 'important';
    await base44.entities.Comment.update(comment.id, { status: newStatus });
    setComments(prev => prev.map(c => c.id === comment.id ? { ...c, status: newStatus } : c));
  };

  const ignoreComment = async (comment) => {
    await base44.entities.Comment.update(comment.id, { status: 'ignored' });
    setComments(prev => prev.map(c => c.id === comment.id ? { ...c, status: 'ignored' } : c));
  };

  const filters = [
    { k: 'all', l: 'الكل', count: comments.filter(c => c.status !== 'ignored').length },
    { k: 'new', l: 'جديدة', count: comments.filter(c => c.status === 'new').length },
    { k: 'important', l: '⭐ مهمة', count: comments.filter(c => c.status === 'important').length },
    { k: 'questions', l: '❓ أسئلة', count: comments.filter(c => c.is_question).length },
    { k: 'replied', l: '✅ مُجاب', count: comments.filter(c => c.status === 'replied').length },
  ];

  const filteredComments = comments.filter(c => {
    if (filter === 'important') return c.status === 'important';
    if (filter === 'questions') return c.is_question;
    if (filter === 'new') return c.status === 'new';
    if (filter === 'replied') return c.status === 'replied';
    return c.status !== 'ignored';
  });

  const sentimentStyle = {
    positive: 'text-green-700 bg-green-50',
    negative: 'text-red-700 bg-red-50',
    neutral: 'text-gray-600 bg-gray-100'
  };
  const sentimentLabel = { positive: '😊 إيجابي', negative: '😞 سلبي', neutral: '😐 محايد' };
  const importantCount = comments.filter(c => c.status === 'important').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">مراقبة التعليقات</h1>
          <p className="text-gray-500 text-sm">راقب التعليقات وردّ عليها تلقائياً بالذكاء الاصطناعي</p>
        </div>
        {importantCount > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl">
            <Bell className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-700">{importantCount} تعليق مهم</span>
          </div>
        )}
      </div>

      {/* Facebook Connection */}
      <div className={`rounded-2xl p-5 mb-6 ${connection ? 'bg-blue-50 border border-blue-200' : 'bg-white border-2 border-dashed border-gray-200 shadow-sm'}`}>
        {connection ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Facebook className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-blue-800">متصل بفيسبوك ✓</p>
                <p className="text-sm text-blue-600">{connection.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connection.pages?.length > 0 && (
                <select value={selectedPage?.id || ''}
                  onChange={e => setSelectedPage(connection.pages.find(p => p.id === e.target.value))}
                  className="border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  {connection.pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <button onClick={disconnect}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 border rounded-xl px-3 py-2 bg-white hover:border-red-300 transition-colors">
                <LogOut className="w-4 h-4" />قطع الاتصال
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Facebook className="w-8 h-8 text-blue-600" />
            </div>
            <p className="font-bold text-gray-800 mb-1 text-lg">ربط حساب فيسبوك</p>
            <p className="text-sm text-gray-500 mb-5">لمراقبة التعليقات على صفحاتك والرد عليها تلقائياً</p>
            <button onClick={connectFacebook} disabled={connectingFB}
              className="btn-primary px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto disabled:opacity-70">
              {connectingFB ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4" />}
              تسجيل الدخول بفيسبوك
            </button>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-right max-w-md mx-auto">
              <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />مطلوب: أضف هذا الرابط في إعدادات تطبيق فيسبوك
              </p>
              <p className="text-xs text-amber-600 mb-1">Meta Developers → تطبيقك → إعدادات → Valid OAuth Redirect URIs</p>
              <code className="text-xs bg-white border rounded px-2 py-1 block text-blue-700 break-all" dir="ltr">
                {window.location.origin}{createPageUrl("FacebookCallback")}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Fetch Comments */}
      {connection && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4" />رابط المنشور أو معرّفه
          </label>
          <div className="flex gap-3">
            <input value={postUrl} onChange={e => setPostUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchComments()}
              className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="https://facebook.com/.../posts/... أو Post ID مثل 123456789_987654321"
              dir="ltr" />
            <button onClick={fetchComments} disabled={!postUrl.trim() || fetchingComments}
              className="btn-primary px-5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
              {fetchingComments ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {fetchingComments ? "جاري الجلب..." : "جلب"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {filters.map(({ k, l, count }) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${filter === k ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 border hover:border-purple-300'}`}>
            {l}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === k ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Comments */}
      {filteredComments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">لا توجد تعليقات</p>
          <p className="text-gray-400 text-sm mt-2">
            {connection ? 'أدخل رابط منشور فيسبوك لجلب التعليقات' : 'قم بربط حساب فيسبوك أولاً'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map(comment => (
            <div key={comment.id}
              className={`bg-white rounded-2xl shadow-sm p-5 border-r-4 transition-all
                ${comment.status === 'important' ? 'border-r-orange-400 bg-orange-50/30' :
                  comment.status === 'replied' ? 'border-r-green-400' :
                  comment.is_question ? 'border-r-blue-400' : 'border-r-gray-200'}`}>

              {/* Comment Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                    {comment.author_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{comment.author_name}</p>
                    <p className="text-xs text-gray-400">
                      {comment.timestamp ? new Date(comment.timestamp).toLocaleString('ar-EG') : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {comment.sentiment && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sentimentStyle[comment.sentiment]}`}>
                      {sentimentLabel[comment.sentiment]}
                    </span>
                  )}
                  {comment.is_question && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">❓ سؤال</span>}
                  {comment.status === 'replied' && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100 flex items-center gap-1"><Check className="w-3 h-3" />مُجاب</span>}
                  {comment.status === 'important' && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100">⭐ مهم</span>}
                </div>
              </div>

              {/* Comment Text */}
              <p className="text-gray-700 text-sm leading-relaxed mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                {comment.content}
              </p>

              {/* Replied message */}
              {comment.status === 'replied' && comment.auto_reply && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-3">
                  <p className="text-xs text-green-600 font-medium mb-1">✅ الرد المُرسل:</p>
                  <p className="text-sm text-green-800">{comment.auto_reply}</p>
                </div>
              )}

              {/* Reply Box */}
              {comment.status !== 'replied' && connection && (
                <div className="flex gap-2 mb-3">
                  <input value={replyTexts[comment.id] || ''}
                    onChange={e => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                    className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="اكتب رداً أو اضغط AI لتوليد رد تلقائي..." />
                  <button onClick={() => generateReply(comment)} disabled={generatingReply[comment.id]}
                    title="توليد رد بالذكاء الاصطناعي"
                    className="px-3 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 flex items-center gap-1 text-xs font-bold transition-colors">
                    {generatingReply[comment.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {!generatingReply[comment.id] && 'AI'}
                  </button>
                  <button onClick={() => sendReply(comment)}
                    disabled={!replyTexts[comment.id]?.trim() || sendingReply[comment.id]}
                    title="إرسال الرد"
                    className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center disabled:opacity-50 transition-colors">
                    {sendingReply[comment.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <button onClick={() => toggleImportant(comment)}
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${comment.status === 'important' ? 'bg-orange-100 text-orange-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                  <Star className="w-3.5 h-3.5" />
                  {comment.status === 'important' ? 'إلغاء التمييز' : 'تمييز'}
                </button>
                {comment.status !== 'replied' && (
                  <button onClick={() => ignoreComment(comment)} className="text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                    تجاهل
                  </button>
                )}
                {comment.fb_post_id && (
                  <a href={`https://www.facebook.com/${comment.fb_post_id}`} target="_blank" rel="noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg text-blue-500 hover:bg-blue-50 flex items-center gap-1 mr-auto transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />فتح في فيسبوك
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}