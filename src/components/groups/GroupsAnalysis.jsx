import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Star, AlertTriangle, Minus, Zap, Loader2, Facebook, MessageCircle, TrendingDown, TrendingUp } from "lucide-react";

export default function GroupsAnalysis({ groups, onUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [updating, setUpdating] = useState(null);

  const featured = groups.filter(g => g.activity_level === "high" && g.is_active);
  const average = groups.filter(g => g.activity_level === "medium" && g.is_active);
  const weak = groups.filter(g => g.activity_level === "low" && g.is_active);
  const disabled = groups.filter(g => !g.is_active);
  const inactive = [...weak, ...disabled];

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت مستشار تسويق خبير. لدى مسوّق رقمي بيانات مجموعاته:\n- إجمالي: ${groups.length} مجموعة\n- مميزة (تفاعل عالٍ): ${featured.length}\n- متوسطة: ${average.length}\n- ضعيفة/غير نشطة: ${inactive.length}\n- فيسبوك: ${groups.filter(g=>g.platform==="facebook").length} | واتساب: ${groups.filter(g=>g.platform==="whatsapp").length}\n- أسماء الضعيفة: ${weak.slice(0,5).map(g=>g.name).join("، ")}\n\nالمطلوب تحليل سريع وعملي يشمل:\n1. تقييم الوضع العام\n2. أسباب ضعف التفاعل في المجموعات الضعيفة\n3. هل تستحق الاستمرار في النشر بها؟\n4. توصيات محددة للأسبوع القادم\n\nاجعل الجواب مختصراً وعملياً باللغة العربية.`,
      model: "gemini_3_flash"
    });
    setAiAnalysis(typeof result === "string" ? result : result?.text || "");
    setAnalyzing(false);
  };

  const markAsInactive = async (group) => {
    setUpdating(group.id);
    await base44.entities.Group.update(group.id, { is_active: false });
    onUpdate();
    setUpdating(null);
  };

  const markAsActive = async (group) => {
    setUpdating(group.id);
    await base44.entities.Group.update(group.id, { is_active: true });
    onUpdate();
    setUpdating(null);
  };

  const GroupRow = ({ group, type }) => (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${type === "featured" ? "bg-green-50 border-green-100" : type === "weak" ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${group.platform === "facebook" ? "badge-fb" : "badge-wa"}`}>
        {group.platform === "facebook"
          ? <Facebook className="w-4 h-4" style={{color:"#1877F2"}} />
          : <MessageCircle className="w-4 h-4" style={{color:"#25D366"}} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{group.name}</p>
        <p className="text-xs text-gray-400">{group.category}{group.member_count ? ` • ${group.member_count.toLocaleString()} عضو` : ""}</p>
      </div>
      {(type === "weak" && group.is_active) && (
        <button onClick={() => markAsInactive(group)} disabled={updating === group.id}
          className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-200 flex items-center gap-1 flex-shrink-0 font-medium">
          {updating === group.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingDown className="w-3 h-3" />}
          استبعاد
        </button>
      )}
      {(!group.is_active) && (
        <button onClick={() => markAsActive(group)} disabled={updating === group.id}
          className="text-xs bg-green-100 text-green-600 px-2.5 py-1 rounded-lg hover:bg-green-200 flex items-center gap-1 flex-shrink-0 font-medium">
          {updating === group.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
          تفعيل
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{featured.length}</div>
          <div className="text-xs text-green-600 font-medium mt-1 flex items-center justify-center gap-1"><Star className="w-3 h-3" />مميزة</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{average.length}</div>
          <div className="text-xs text-yellow-600 font-medium mt-1 flex items-center justify-center gap-1"><Minus className="w-3 h-3" />متوسطة</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{weak.length}</div>
          <div className="text-xs text-red-500 font-medium mt-1 flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" />ضعيفة</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-500">{disabled.length}</div>
          <div className="text-xs text-gray-500 font-medium mt-1">معطّلة</div>
        </div>
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-green-600" />
            <h3 className="font-bold text-gray-800 text-sm">مجموعات مميزة — تفاعل عالٍ ({featured.length})</h3>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {featured.map(g => <GroupRow key={g.id} group={g} type="featured" />)}
          </div>
        </div>
      )}

      {/* Average */}
      {average.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Minus className="w-4 h-4 text-yellow-600" />
            <h3 className="font-bold text-gray-800 text-sm">مجموعات متوسطة ({average.length})</h3>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto">
            {average.map(g => <GroupRow key={g.id} group={g} type="average" />)}
          </div>
        </div>
      )}

      {/* Weak / Inactive */}
      {inactive.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-gray-800 text-sm">مجموعات ضعيفة / غير نشطة ({inactive.length})</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">يُنصح باستبعادها من الحملات لتوفير الوقت وتجنب الإزعاج</p>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {inactive.map(g => <GroupRow key={g.id} group={g} type={g.is_active ? "weak" : "disabled"} />)}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-gray-800 text-sm">تحليل ذكي بالذكاء الاصطناعي</h3>
          </div>
          <button onClick={analyzeWithAI} disabled={analyzing}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50">
            {analyzing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />يحلل...</> : <><Zap className="w-3.5 h-3.5" />تحليل الآن</>}
          </button>
        </div>
        <div className="p-5">
          {aiAnalysis ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
          ) : (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">اضغط "تحليل الآن" للحصول على تقييم ذكي ومخصص لمجموعاتك</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}