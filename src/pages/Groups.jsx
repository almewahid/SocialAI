import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Plus, Search, Trash2, Edit2, Facebook, MessageCircle,
  Users, Clock, Activity, ToggleLeft, ToggleRight, Upload, BarChart2
} from "lucide-react";
import GroupsAnalysis from "@/components/groups/GroupsAnalysis";

const CATEGORIES = ["بيع وشراء", "خدمات", "عقارات", "وظائف", "تقنية", "صحة", "تعليم", "ترفيه", "أخرى"];

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", platform: "facebook", link: "", category: "بيع وشراء",
    member_count: "", best_posting_time: "", notes: "", is_active: true, activity_level: "medium"
  });

  useEffect(() => { loadGroups(); }, []);

  const loadGroups = async () => {
    const data = await base44.entities.Group.list("-created_date", 500);
    setGroups(data);
    setLoading(false);
  };

  const openAdd = () => {
    setEditGroup(null);
    setForm({ name: "", platform: "facebook", link: "", category: "بيع وشراء", member_count: "", best_posting_time: "", notes: "", is_active: true, activity_level: "medium" });
    setShowForm(true);
  };

  const openEdit = (g) => {
    setEditGroup(g);
    setForm({ ...g, member_count: g.member_count || "" });
    setShowForm(true);
  };

  const saveGroup = async () => {
    setSaving(true);
    const data = { ...form, member_count: form.member_count ? Number(form.member_count) : undefined };
    if (editGroup) {
      await base44.entities.Group.update(editGroup.id, data);
    } else {
      await base44.entities.Group.create(data);
    }
    setSaving(false);
    setShowForm(false);
    loadGroups();
  };

  const deleteGroup = async (id) => {
    if (!confirm("هل تريد حذف هذه المجموعة؟")) return;
    await base44.entities.Group.delete(id);
    loadGroups();
  };

  const toggleActive = async (g) => {
    await base44.entities.Group.update(g.id, { is_active: !g.is_active });
    loadGroups();
  };

  const handleBulkImport = async () => {
    const lines = bulkText.trim().split("\n").filter(l => l.trim());
    setSaving(true);
    for (const line of lines) {
      const parts = line.split("|").map(p => p.trim());
      await base44.entities.Group.create({
        name: parts[0] || "مجموعة",
        platform: parts[1] === "wa" ? "whatsapp" : "facebook",
        link: parts[2] || "",
        category: parts[3] || "أخرى",
        is_active: true,
        activity_level: "medium"
      });
    }
    setSaving(false);
    setShowBulk(false);
    setBulkText("");
    loadGroups();
  };

  const filtered = groups.filter(g => {
    const matchSearch = g.name.includes(search) || (g.link || "").includes(search);
    const matchPlatform = filterPlatform === "all" || g.platform === filterPlatform;
    return matchSearch && matchPlatform;
  });

  const activityColor = { high: "#059669", medium: "#d97706", low: "#6b7280" };
  const activityLabel = { high: "نشطة", medium: "متوسطة", low: "منخفضة" };

  const [activeTab, setActiveTab] = useState("list");

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المجموعات</h1>
          <p className="text-gray-500 text-sm mt-1">{groups.length} مجموعة مضافة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            <span className="hidden md:block">استيراد بالجملة</span>
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium">
            <Plus className="w-4 h-4" />
            إضافة مجموعة
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border rounded-xl overflow-hidden shadow-sm mb-6 w-fit">
        <button onClick={() => setActiveTab("list")} className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === "list" ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
          <Users className="w-4 h-4" />المجموعات
        </button>
        <button onClick={() => setActiveTab("analysis")} className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === "analysis" ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
          <BarChart2 className="w-4 h-4" />تحليل الأداء
        </button>
      </div>

      {activeTab === "analysis" && (
        <GroupsAnalysis groups={groups} onUpdate={loadGroups} />
      )}

      {activeTab === "list" && (<>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48 relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full pr-10 pl-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
        </div>
        <div className="flex bg-white border rounded-xl overflow-hidden">
          {["all", "facebook", "whatsapp"].map(p => (
            <button key={p} onClick={() => setFilterPlatform(p)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filterPlatform === p ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              {p === "all" ? "الكل" : p === "facebook" ? "فيسبوك" : "واتساب"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold" style={{ color: "#1877F2" }}>{groups.filter(g => g.platform === "facebook").length}</p>
          <p className="text-xs text-gray-500 mt-1">فيسبوك</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold" style={{ color: "#25D366" }}>{groups.filter(g => g.platform === "whatsapp").length}</p>
          <p className="text-xs text-gray-500 mt-1">واتساب</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{groups.filter(g => g.is_active).length}</p>
          <p className="text-xs text-gray-500 mt-1">نشطة</p>
        </div>
      </div>

      {/* Groups Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">لا توجد مجموعات</p>
          <p className="text-gray-400 text-sm mt-2">أضف مجموعاتك لتبدأ الحملات</p>
          <button onClick={openAdd} className="mt-4 btn-primary px-6 py-2 rounded-xl text-sm font-medium">إضافة مجموعة</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(g => (
            <div key={g.id} className={`card-hover bg-white rounded-2xl shadow-sm p-5 border-r-4 ${g.is_active ? "border-r-green-400" : "border-r-gray-200"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${g.platform === "facebook" ? "badge-fb" : "badge-wa"}`}>
                    {g.platform === "facebook" 
                      ? <Facebook className="w-5 h-5" style={{ color: "#1877F2" }} />
                      : <MessageCircle className="w-5 h-5" style={{ color: "#25D366" }} />
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm leading-tight">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.category}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(g)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteGroup(g.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-gray-500">
                {g.member_count && <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /><span>{g.member_count.toLocaleString()} عضو</span></div>}
                {g.best_posting_time && <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /><span>أفضل وقت: {g.best_posting_time}</span></div>}
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  <span style={{ color: activityColor[g.activity_level || "medium"] }}>{activityLabel[g.activity_level || "medium"]}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                {g.link ? (
                  <a href={g.link} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline truncate max-w-32">فتح الرابط</a>
                ) : <span />}
                <button onClick={() => toggleActive(g)} className="flex items-center gap-1 text-xs">
                  {g.is_active 
                    ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600">نشطة</span></>
                    : <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-400">معطلة</span></>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </>)}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">{editGroup ? "تعديل المجموعة" : "إضافة مجموعة"}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المجموعة *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="اكتب اسم المجموعة" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المنصة</label>
                <div className="flex gap-3">
                  {["facebook", "whatsapp"].map(p => (
                    <button key={p} onClick={() => setForm({...form, platform: p})}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${form.platform === p ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600"}`}>
                      {p === "facebook" ? <><Facebook className="w-4 h-4" />فيسبوك</> : <><MessageCircle className="w-4 h-4" />واتساب</>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الرابط</label>
                <input value={form.link} onChange={e => setForm({...form, link: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="https://..." dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">عدد الأعضاء</label>
                  <input type="number" value={form.member_count} onChange={e => setForm({...form, member_count: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">أفضل وقت للنشر</label>
                  <input value={form.best_posting_time} onChange={e => setForm({...form, best_posting_time: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="مثال: 9 صباحاً" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مستوى النشاط</label>
                <div className="flex gap-2">
                  {[{v:"high",l:"عالي"},{v:"medium",l:"متوسط"},{v:"low",l:"منخفض"}].map(({v,l}) => (
                    <button key={v} onClick={() => setForm({...form, activity_level: v})}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.activity_level === v ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" rows={3} placeholder="أي ملاحظات إضافية..." />
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={saveGroup} disabled={saving || !form.name} className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-800">استيراد بالجملة</h2>
              <p className="text-sm text-gray-500 mt-1">أدخل كل مجموعة في سطر بالتنسيق:</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block" dir="ltr">اسم المجموعة | fb أو wa | الرابط | التصنيف</code>
            </div>
            <div className="p-6">
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" rows={8} placeholder={`مجموعة البيع والشراء | fb | https://fb.com/groups/... | بيع وشراء\nمجموعة واتساب | wa | https://chat.whatsapp.com/... | خدمات`} />
            </div>
            <div className="p-6 border-t flex gap-3">
              <button onClick={() => setShowBulk(false)} className="flex-1 border rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleBulkImport} disabled={saving || !bulkText.trim()} className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
                {saving ? "جاري الاستيراد..." : "استيراد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}