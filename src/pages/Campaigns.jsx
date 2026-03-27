import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Play, Pause, Clock, CheckCircle, XCircle, 
  Megaphone, Plus, Facebook, MessageCircle, 
  Loader2, ChevronDown, ChevronUp, Zap, Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const DELAY_PRESETS = [
  { label: "سريع", sublabel: "3 دقائق", value: 3, color: "green" },
  { label: "متوسط", sublabel: "10 دقائق", value: 10, color: "yellow" },
  { label: "بطيء", sublabel: "30 دقيقة", value: 30, color: "red" },
];

// دورة التأخير العشوائي: 3 → 5 → 6 → 3 → 5 → 6 ...
const RANDOM_DELAY_CYCLE = [3, 5, 6];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [delay, setDelay] = useState(10);
  const [useRandomDelay, setUseRandomDelay] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("post_id");
    // Wait for data to load before opening modal
    loadData().then(() => {
      if (postId) {
        setSelectedPostId(postId);
        setShowNewModal(true);
      }
    });
  }, []);

  const loadData = async () => {
    const [c, p, g] = await Promise.all([
      base44.entities.Campaign.list("-created_date", 50),
      base44.entities.Post.list("-created_date", 100),
      base44.entities.Group.list("-created_date", 500),
    ]);
    setCampaigns(c);
    setPosts(p);
    setGroups(g);
    setLoading(false);
  };

  const getGroup = (id) => groups.find(g => g.id === id);
  const getPost = (id) => posts.find(p => p.id === id);

  const createCampaign = async () => {
    if (!selectedPostId || !campaignName) return;
    setCreating(true);
    const post = getPost(selectedPostId);
    if (!post) { setCreating(false); return; }

    const targetGroups = post.target_groups || [];
    if (targetGroups.length === 0) { setCreating(false); return; }

    const now = new Date();
    let cumulativeMs = 0;
    const plan = targetGroups.map((gid, idx) => {
      const g = getGroup(gid);
      let thisDelay = 0;
      if (idx > 0) {
        if (useRandomDelay) {
          // دورة 3 → 5 → 6 → 3 → 5 → 6 ...
          thisDelay = RANDOM_DELAY_CYCLE[(idx - 1) % RANDOM_DELAY_CYCLE.length];
        } else {
          thisDelay = delay;
        }
        cumulativeMs += thisDelay * 60000;
      }
      const scheduledTime = new Date(now.getTime() + cumulativeMs);
      return {
        group_id: gid,
        group_name: g?.name || "مجموعة",
        platform: g?.platform || "facebook",
        scheduled_time: scheduledTime.toISOString(),
        status: "pending",
        delay_minutes: thisDelay
      };
    });

    await base44.entities.Campaign.create({
      name: campaignName,
      post_id: selectedPostId,
      group_ids: targetGroups,
      schedule_plan: plan,
      status: "draft",
      total_groups: targetGroups.length,
      sent_count: 0,
      delay_between_posts: useRandomDelay ? -1 : delay
    });
    await base44.entities.Post.update(selectedPostId, { status: "scheduled" });
    setCreating(false);
    setShowNewModal(false);
    setSelectedPostId("");
    setCampaignName("");
    setDelay(10);
    setUseRandomDelay(false);
    loadData();
  };

  const toggleCampaign = async (campaign) => {
    if (campaign.status === "active") {
      await base44.entities.Campaign.update(campaign.id, { status: "paused" });
    } else {
      await base44.entities.Campaign.update(campaign.id, { status: "active", started_at: new Date().toISOString() });
    }
    loadData();
  };

  const markItemSent = async (campaign, itemIdx) => {
    const plan = [...(campaign.schedule_plan || [])];
    plan[itemIdx] = { ...plan[itemIdx], status: "sent" };
    const sentCount = plan.filter(p => p.status === "sent").length;
    const allDone = sentCount === plan.length;
    await base44.entities.Campaign.update(campaign.id, {
      schedule_plan: plan,
      sent_count: sentCount,
      status: allDone ? "completed" : campaign.status,
      ...(allDone && { completed_at: new Date().toISOString() })
    });
    if (allDone) {
      await base44.entities.Post.update(campaign.post_id, { status: "published", published_count: sentCount });
    }
    loadData();
  };

  const statusBadge = (status) => {
    const map = {
      draft: { label: "مسودة", color: "#6b7280", bg: "#f3f4f6" },
      active: { label: "نشطة", color: "#059669", bg: "#d1fae5" },
      paused: { label: "متوقفة", color: "#d97706", bg: "#fef3c7" },
      completed: { label: "مكتملة", color: "#6C5CE7", bg: "#ede9fe" },
    };
    const s = map[status] || map.draft;
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{color:s.color, background:s.bg}}>{s.label}</span>;
  };

  const closeModal = () => {
    setShowNewModal(false);
    setSelectedPostId("");
    setCampaignName("");
  };

  const postsWithGroups = posts.filter(p => (p.target_groups || []).length > 0);
  const selectedPost = getPost(selectedPostId);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الحملات</h1>
          <p className="text-gray-500 text-sm">إدارة خطط النشر على المجموعات</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl("CreatePost")} className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Plus className="w-4 h-4" />منشور جديد
          </Link>
          <button onClick={() => setShowNewModal(true)} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium">
            <Zap className="w-4 h-4" />حملة جديدة
          </button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <Megaphone className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">لا توجد حملات بعد</p>
          <p className="text-gray-400 text-sm mt-2">أنشئ منشوراً ثم أطلق حملة نشر</p>
          <Link to={createPageUrl("CreatePost")} className="mt-4 inline-block btn-primary px-6 py-2 rounded-xl text-sm font-medium">إنشاء منشور</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => {
            const post = getPost(campaign.post_id);
            const progress = campaign.total_groups > 0 ? Math.round((campaign.sent_count / campaign.total_groups) * 100) : 0;
            const isExpanded = expandedCampaign === campaign.id;
            return (
              <div key={campaign.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800">{campaign.name}</h3>
                        {statusBadge(campaign.status)}
                      </div>
                      {post && <p className="text-sm text-gray-500 line-clamp-1">{post.selected_version || post.original_content}</p>}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Megaphone className="w-3.5 h-3.5" />{campaign.total_groups} مجموعة</span>
                        <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" />{campaign.sent_count} تم</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{campaign.delay_between_posts === -1 ? "🎲 عشوائي" : `${campaign.delay_between_posts} د. تأخير`}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.status !== "completed" && (
                        <button onClick={() => toggleCampaign(campaign)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${campaign.status === "active" ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                          {campaign.status === "active" ? <><Pause className="w-3.5 h-3.5" />إيقاف</> : <><Play className="w-3.5 h-3.5" />تشغيل</>}
                        </button>
                      )}
                      <button onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1"><span>التقدم</span><span>{progress}%</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{width:`${progress}%`, background:"#6C5CE7"}} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t bg-gray-50 p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">جدول النشر</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(campaign.schedule_plan || []).map((item, idx) => (
                        <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl bg-white border ${item.status === "sent" ? "border-green-200 bg-green-50" : item.status === "failed" ? "border-red-200" : "border-gray-100"}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.platform === "facebook" ? "badge-fb" : "badge-wa"}`}>
                            {item.platform === "facebook" ? <Facebook className="w-4 h-4" style={{color:"#1877F2"}} /> : <MessageCircle className="w-4 h-4" style={{color:"#25D366"}} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.group_name}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{new Date(item.scheduled_time).toLocaleString("ar-EG")}
                              {item.delay_minutes > 0 && <span className="mr-1 text-gray-300">• +{item.delay_minutes}د</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.status === "sent" && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {item.status === "failed" && <XCircle className="w-4 h-4 text-red-500" />}
                            {item.status === "pending" && <Clock className="w-4 h-4 text-gray-400" />}
                            {item.status === "pending" && campaign.status === "active" && (
                              <button onClick={() => markItemSent(campaign, idx)}
                                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 font-medium">
                                تم ✓
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Campaign Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">حملة نشر جديدة</h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الحملة</label>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="مثال: حملة رمضان 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المنشور</label>
                <select value={selectedPostId} onChange={e => setSelectedPostId(e.target.value)}
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                  <option value="">اختر منشور...</option>
                  {postsWithGroups.map(p => (
                    <option key={p.id} value={p.id}>
                      {(p.selected_version || p.original_content || "").slice(0, 55)}...
                    </option>
                  ))}
                </select>
                {selectedPost && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Megaphone className="w-3 h-3" />
                    {(selectedPost.target_groups || []).length} مجموعة مستهدفة
                  </p>
                )}
              </div>

              {/* Delay Presets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">التأخير بين المنشورات</label>
                  <button onClick={() => setUseRandomDelay(!useRandomDelay)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border-2 font-bold transition-all ${useRandomDelay ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-300"}`}>
                    🎲 {useRandomDelay ? "عشوائي ✓" : "عشوائي"}
                  </button>
                </div>

                {useRandomDelay ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-green-800 mb-2">🎲 وضع التأخير العشوائي المتغير</p>
                    <p className="text-xs text-green-700 mb-3">التأخير يتكرر بشكل دوري لتبدو المنشورات طبيعية:</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {RANDOM_DELAY_CYCLE.map((d, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className="bg-white border border-green-300 rounded-lg px-3 py-1.5 text-sm font-bold text-green-800">{d} د</span>
                          {i < RANDOM_DELAY_CYCLE.length - 1 && <span className="text-green-400 font-bold">→</span>}
                        </div>
                      ))}
                      <span className="text-green-400 font-bold">→ 🔄</span>
                    </div>
                    {selectedPost && (
                      <p className="text-xs text-green-600 mt-2">
                        ⏱️ متوسط التأخير: {Math.round(RANDOM_DELAY_CYCLE.reduce((a,b) => a+b, 0) / RANDOM_DELAY_CYCLE.length * 10) / 10} دقائق
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {DELAY_PRESETS.map(preset => (
                        <button key={preset.value} onClick={() => setDelay(preset.value)}
                          className={`py-3 rounded-xl border-2 text-center transition-all ${delay === preset.value ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-200"}`}>
                          <p className={`text-sm font-bold ${delay === preset.value ? "text-purple-700" : "text-gray-700"}`}>{preset.label}</p>
                          <p className={`text-xs mt-0.5 ${delay === preset.value ? "text-purple-500" : "text-gray-400"}`}>{preset.sublabel}</p>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-500 flex-shrink-0">مخصص:</span>
                      <input type="number" min="1" max="120" value={delay} onChange={e => setDelay(Number(e.target.value))}
                        className="w-20 border rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-300" />
                      <span className="text-xs text-gray-500">دقيقة</span>
                    </div>
                    {selectedPost && (
                      <p className="text-xs text-gray-400 mt-2">
                        ⏱️ مجموع الوقت المتوقع: {Math.round(((selectedPost.target_groups || []).length * delay) / 60 * 10) / 10} ساعة
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button onClick={closeModal} className="flex-1 border rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={createCampaign} disabled={!selectedPostId || !campaignName || creating || !(selectedPost?.target_groups?.length)}
                className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الإنشاء...</> : "إنشاء الحملة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}