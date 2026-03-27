import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart3, TrendingUp, CheckCircle, XCircle,
  Facebook, MessageCircle, Zap, Download, Calendar,
  Loader2, Star, Award
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#6C5CE7", "#25D366", "#1877F2", "#FDCB6E", "#E17055"];

export default function Reports() {
  const [campaigns, setCampaigns] = useState([]);
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    Promise.all([
      base44.entities.Campaign.list("-created_date", 100),
      base44.entities.Post.list("-created_date", 200),
      base44.entities.Group.list("-created_date", 500),
    ]).then(([c, p, g]) => {
      setCampaigns(c);
      setPosts(p);
      setGroups(g);
      setLoading(false);
    });
  }, []);

  const filterByPeriod = (items, field = "created_date") => {
    const now = new Date();
    const days = period === "week" ? 7 : period === "month" ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return items.filter(i => new Date(i[field] || i.created_date) >= cutoff);
  };

  const recentCampaigns = filterByPeriod(campaigns);
  const recentPosts = filterByPeriod(posts);

  const totalGroups = groups.length;
  const fbGroups = groups.filter(g => g.platform === "facebook").length;
  const waGroups = groups.filter(g => g.platform === "whatsapp").length;

  const totalSent = recentCampaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
  const totalTargeted = recentCampaigns.reduce((s, c) => s + (c.total_groups || 0), 0);
  const successRate = totalTargeted > 0 ? Math.round((totalSent / totalTargeted) * 100) : 0;

  const completedCampaigns = recentCampaigns.filter(c => c.status === "completed").length;
  const activeCampaigns = recentCampaigns.filter(c => c.status === "active").length;

  // Platform distribution
  const platformData = [
    { name: "فيسبوك", value: fbGroups },
    { name: "واتساب", value: waGroups },
  ];

  // Campaign status distribution
  const statusData = [
    { name: "مكتملة", value: completedCampaigns },
    { name: "نشطة", value: activeCampaigns },
    { name: "مسودة", value: recentCampaigns.filter(c => c.status === "draft").length },
    { name: "متوقفة", value: recentCampaigns.filter(c => c.status === "paused").length },
  ].filter(d => d.value > 0);

  // Posts by style
  const styleCount = {};
  recentPosts.forEach(p => {
    const s = p.language_style || "عامية";
    styleCount[s] = (styleCount[s] || 0) + 1;
  });
  const styleData = Object.entries(styleCount).map(([name, value]) => ({ name, value }));

  // Top campaigns
  const topCampaigns = [...recentCampaigns]
    .sort((a, b) => (b.sent_count || 0) - (a.sent_count || 0))
    .slice(0, 5);

  const generateAiReport = async () => {
    setGeneratingReport(true);
    const summary = {
      period: period === "week" ? "أسبوع" : period === "month" ? "شهر" : "3 أشهر",
      totalGroups, fbGroups, waGroups,
      totalCampaigns: recentCampaigns.length,
      completedCampaigns, totalSent, successRate,
      totalPosts: recentPosts.length,
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت مستشار تسويق رقمي خبير. بناءً على هذه البيانات الإحصائية لمسوّق فردي خلال ${summary.period}:\n${JSON.stringify(summary, null, 2)}\n\nاكتب تقرير أداء مختصر وعملي بالعربية يتضمن:\n1. ملخص الأداء (جملتين)\n2. أبرز الإنجازات (نقطتان)\n3. نقاط تحتاج تحسين (نقطتان)\n4. توصيات للأسبوع القادم (3 توصيات عملية)\n\nاجعل الأسلوب مباشر ومحفز وعملي.`,
      model: "gemini_3_flash"
    });

    setAiReport(typeof result === "string" ? result : result?.text || "");
    setGeneratingReport(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التقارير والإحصائيات</h1>
          <p className="text-gray-500 text-sm">تحليل أداء حملاتك التسويقية</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white border rounded-xl overflow-hidden shadow-sm">
            {[{ v: "week", l: "أسبوع" }, { v: "month", l: "شهر" }, { v: "quarter", l: "3 أشهر" }].map(({ v, l }) => (
              <button key={v} onClick={() => setPeriod(v)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${period === v ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "إجمالي المجموعات", value: totalGroups, icon: Facebook, color: "#6C5CE7", bg: "#F0EEFF" },
          { label: "منشورات تم الإرسال", value: totalSent, icon: CheckCircle, color: "#059669", bg: "#d1fae5" },
          { label: "معدل النجاح", value: `${successRate}%`, icon: TrendingUp, color: "#d97706", bg: "#fef3c7" },
          { label: "حملات مكتملة", value: completedCampaigns, icon: Award, color: "#1877F2", bg: "#dbeafe" },
        ].map((s, i) => (
          <div key={i} className="card-hover bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Platform Distribution */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">توزيع المجموعات حسب المنصة</h3>
          {totalGroups === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={platformData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {platformData.map((_, i) => <Cell key={i} fill={["#1877F2", "#25D366"][i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Facebook className="w-4 h-4" style={{ color: "#1877F2" }} />
              <span className="text-gray-600">فيسبوك: <strong>{fbGroups}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} />
              <span className="text-gray-600">واتساب: <strong>{waGroups}</strong></span>
            </div>
          </div>
        </div>

        {/* Campaign Status */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">حالة الحملات</h3>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">لا توجد حملات في هذه الفترة</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "sans-serif" }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6C5CE7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Campaigns */}
      {topCampaigns.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b">
            <h3 className="font-bold text-gray-800">أفضل الحملات أداءً</h3>
          </div>
          <div className="divide-y">
            {topCampaigns.map((c, idx) => {
              const rate = c.total_groups > 0 ? Math.round((c.sent_count / c.total_groups) * 100) : 0;
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold`}
                    style={{ background: ["#6C5CE7", "#a29bfe", "#b2bec3"][idx] || "#b2bec3" }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${rate}%`, background: "#6C5CE7" }} />
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{c.sent_count}/{c.total_groups}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-purple-700">{rate}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Report */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-800">تقرير الذكاء الاصطناعي</h3>
          </div>
          <button onClick={generateAiReport} disabled={generatingReport}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
            {generatingReport ? <><Loader2 className="w-4 h-4 animate-spin" />جاري التحليل...</> : <><Zap className="w-4 h-4" />توليد تقرير</>}
          </button>
        </div>
        <div className="p-5">
          {aiReport ? (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{aiReport}</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">اضغط "توليد تقرير" للحصول على تحليل ذكي لأدائك</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}