import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, CheckCircle, Trash2, Play, Users, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STATUS_MAP = {
  draft: { label: "مسودة", color: "#6b7280", bg: "#f3f4f6" },
  scheduled: { label: "مجدول ⏰", color: "#d97706", bg: "#fef3c7" },
  publishing: { label: "جاري النشر", color: "#2563eb", bg: "#dbeafe" },
  published: { label: "منشور ✅", color: "#059669", bg: "#d1fae5" },
  failed: { label: "فشل ❌", color: "#dc2626", bg: "#fee2e2" },
};

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "scheduled", label: "مجدول" },
  { key: "publishing", label: "جاري النشر" },
  { key: "published", label: "منشور" },
  { key: "draft", label: "مسودة" },
  { key: "failed", label: "فشل" },
];

export default function ScheduledPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    const data = await base44.entities.Post.list("-created_date", 100);
    setPosts(data);
    setLoading(false);
  };

  const deletePost = async (id) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await base44.entities.Post.delete(id);
    loadPosts();
  };

  const filteredPosts = filter === "all" ? posts : posts.filter(p => p.status === filter);
  const scheduledCount = posts.filter(p => p.status === "scheduled").length;
  const publishedCount = posts.filter(p => p.status === "published").length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المنشورات</h1>
          <p className="text-gray-500 text-sm">إدارة وتتبع حالة جميع منشوراتك</p>
        </div>
        <Link to={createPageUrl("CreatePost")} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" />منشور جديد
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{posts.length}</p>
          <p className="text-xs text-gray-500 mt-1">إجمالي المنشورات</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-amber-700">{scheduledCount}</p>
          <p className="text-xs text-amber-600 mt-1">مجدولة</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-700">{publishedCount}</p>
          <p className="text-xs text-green-600 mt-1">منشورة</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filter === f.key ? "bg-purple-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 border"}`}>
            {f.label} ({f.key === "all" ? posts.length : posts.filter(p => p.status === f.key).length})
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <Clock className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">لا توجد منشورات</p>
          <Link to={createPageUrl("CreatePost")} className="mt-4 inline-block btn-primary px-6 py-2 rounded-xl text-sm font-medium">إنشاء منشور</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map(post => {
            const s = STATUS_MAP[post.status] || STATUS_MAP.draft;
            return (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{color: s.color, background: s.bg}}>
                        {s.label}
                      </span>
                      {post.scheduled_at && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(post.scheduled_at).toLocaleString("ar-EG")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
                      {post.selected_version || post.original_content}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {(post.target_groups || []).length} مجموعة
                      </span>
                      {post.published_count > 0 && (
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {post.published_count} تم نشره
                        </span>
                      )}
                      <span>{new Date(post.created_date).toLocaleDateString("ar-EG")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(post.status === "draft" || post.status === "scheduled") && (post.target_groups || []).length > 0 && (
                      <Link to={createPageUrl("Campaigns") + `?post_id=${post.id}`}
                        className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-xl hover:bg-purple-200 font-medium flex items-center gap-1">
                        <Play className="w-3 h-3" />إطلاق
                      </Link>
                    )}
                    <button onClick={() => deletePost(post.id)}
                      className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}