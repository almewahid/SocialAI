import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Users, FileText, Megaphone, TrendingUp, 
  Plus, Clock, CheckCircle, AlertCircle, Zap,
  Facebook, MessageCircle, ArrowLeft
} from "lucide-react";

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Group.list("-created_date", 200),
      base44.entities.Post.list("-created_date", 50),
      base44.entities.Campaign.list("-created_date", 20),
    ]).then(([g, p, c]) => {
      setGroups(g);
      setPosts(p);
      setCampaigns(c);
      setLoading(false);
    });
  }, []);

  const fbGroups = groups.filter(g => g.platform === "facebook");
  const waGroups = groups.filter(g => g.platform === "whatsapp");
  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const publishedPosts = posts.filter(p => p.status === "published");

  const stats = [
    { label: "مجموعات فيسبوك", value: fbGroups.length, icon: Facebook, color: "#1877F2", bg: "#E8F0FE" },
    { label: "مجموعات واتساب", value: waGroups.length, icon: MessageCircle, color: "#25D366", bg: "#E8F8EF" },
    { label: "المنشورات المنشورة", value: publishedPosts.length, icon: CheckCircle, color: "#6C5CE7", bg: "#F0EEFF" },
    { label: "الحملات النشطة", value: activeCampaigns.length, icon: Megaphone, color: "#E17055", bg: "#FFF0ED" },
  ];

  const recentPosts = posts.slice(0, 5);

  const statusBadge = (status) => {
    const map = {
      draft: { label: "مسودة", color: "#6b7280", bg: "#f3f4f6" },
      scheduled: { label: "مجدول", color: "#2563eb", bg: "#dbeafe" },
      publishing: { label: "ينشر...", color: "#d97706", bg: "#fef3c7" },
      published: { label: "منشور", color: "#059669", bg: "#d1fae5" },
      failed: { label: "فشل", color: "#dc2626", bg: "#fee2e2" },
    };
    const s = map[status] || map.draft;
    return <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">جاري التحميل...</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">لوحة التحكم</h1>
          <p className="text-gray-500 mt-1">مرحباً! هنا ملخص نشاطك التسويقي</p>
        </div>
        <Link to={createPageUrl("CreatePost")} 
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" />
          <span className="hidden md:block">منشور جديد</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="card-hover bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <span className="text-3xl font-bold text-gray-800">{s.value}</span>
            </div>
            <p className="text-sm text-gray-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent Posts */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-bold text-gray-800">آخر المنشورات</h2>
            <Link to={createPageUrl("CreatePost")} className="text-purple-600 text-sm font-medium flex items-center gap-1">
              <span>عرض الكل</span><ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y">
            {recentPosts.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">لا توجد منشورات بعد</p>
                <Link to={createPageUrl("CreatePost")} className="mt-3 inline-block text-purple-600 text-sm font-medium">أنشئ أول منشور →</Link>
              </div>
            ) : recentPosts.map(post => (
              <div key={post.id} className="px-6 py-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{post.selected_version || post.original_content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {statusBadge(post.status)}
                    {post.scheduled_at && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(post.scheduled_at).toLocaleDateString("ar")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions + Tips */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">إجراءات سريعة</h3>
            <div className="space-y-2">
              <Link to={createPageUrl("Groups")} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">إضافة مجموعة</span>
              </Link>
              <Link to={createPageUrl("CreatePost")} className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
                <Zap className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">إنشاء منشور بالذكاء الاصطناعي</span>
              </Link>
              <Link to={createPageUrl("Campaigns")} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
                <Megaphone className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">بدء حملة نشر</span>
              </Link>
              <Link to={createPageUrl("Reports")} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">عرض التقارير</span>
              </Link>
            </div>
          </div>

          {/* AI Tip */}
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#6C5CE7,#a29bfe)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-300" />
              <span className="text-white font-bold text-sm">نصيحة الذكاء الاصطناعي</span>
            </div>
            <p className="text-purple-100 text-xs leading-relaxed">
              أفضل وقت للنشر في معظم مجموعات البيع والشراء هو بين 8-10 صباحاً و8-10 مساءً. جرّب الجدولة في هذه الأوقات لزيادة التفاعل!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}