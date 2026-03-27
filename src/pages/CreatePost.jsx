import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Wand2, Copy, Check, Loader2, Sparkles, RefreshCw, Facebook, 
  MessageCircle, ArrowLeft, Star, Image as ImageIcon, Video, Link2, X, Upload, Clock, Send
} from "lucide-react";

const STYLES = ["فصحى", "عامية", "خليجي", "مصري", "شامي"];
const TONES = ["رسمي", "ودي", "تسويقي", "تعليمي", "ترفيهي"];

export default function CreatePost() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [step, setStep] = useState(1);
  const [originalContent, setOriginalContent] = useState("");
  const [style, setStyle] = useState("عامية");
  const [tone, setTone] = useState("تسويقي");
  const [aiVersions, setAiVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [groups, setGroups] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scheduleMode, setScheduleMode] = useState("now"); // "now" | "later"
  const [scheduledAt, setScheduledAt] = useState("");
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [searchGroup, setSearchGroup] = useState("");

  // Media
  const [mediaType, setMediaType] = useState(null); // null | "image" | "video" | "link"
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPreview, setMediaPreview] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    base44.entities.Group.filter({ is_active: true }, "-created_date", 500).then(setGroups);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    setMediaPreview(URL.createObjectURL(file));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setMediaUrl(file_url);
    setUploadingMedia(false);
  };

  const clearMedia = () => {
    setMediaType(null); setMediaUrl(""); setMediaPreview(""); setLinkUrl(""); setAiImagePrompt("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const generateAiImage = async () => {
    if (!aiImagePrompt.trim()) return;
    setGeneratingImage(true);
    const result = await base44.integrations.Core.GenerateImage({ prompt: aiImagePrompt });
    if (result?.url) {
      setMediaUrl(result.url);
      setMediaPreview(result.url);
    }
    setGeneratingImage(false);
  };

  const generateVersions = async () => {
    if (!originalContent.trim()) return;
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `أنت خبير تسويق رقمي عربي. المحتوى الأصلي للمنشور:\n"${originalContent}"\n\nالمطلوب:\n1. أعد صياغة هذا المنشور بـ 3 نسخ مختلفة (${style} - نبرة ${tone})\n2. قدّم اقتراحات لتحسين المنشور\n3. كل نسخة مناسبة للنشر في مجموعات فيسبوك/واتساب\n\nأعطني الرد بهذا التنسيق بالضبط:\nVERSION1: [النسخة الأولى]\nVERSION2: [النسخة الثانية]\nVERSION3: [النسخة الثالثة]\nSUGGESTIONS: [اقتراحات التحسين]`,
      model: "gemini_3_flash"
    });
    const text = typeof result === "string" ? result : result?.text || "";
    const v1 = text.match(/VERSION1:\s*([\s\S]*?)(?=VERSION2:|$)/)?.[1]?.trim() || "";
    const v2 = text.match(/VERSION2:\s*([\s\S]*?)(?=VERSION3:|$)/)?.[1]?.trim() || "";
    const v3 = text.match(/VERSION3:\s*([\s\S]*?)(?=SUGGESTIONS:|$)/)?.[1]?.trim() || "";
    const sugg = text.match(/SUGGESTIONS:\s*([\s\S]*?)$/)?.[1]?.trim() || "";
    const versions = [v1, v2, v3].filter(v => v.length > 0);
    setAiVersions(versions);
    setSelectedVersion(versions[0] || originalContent);
    setAiSuggestions(sugg);
    setGenerating(false);
    setStep(2);
  };

  const copyVersion = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const filteredGroups = groups.filter(g => {
    return g.name.includes(searchGroup) && (filterPlatform === "all" || g.platform === filterPlatform);
  });

  const toggleGroup = (id) => {
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const visible = filteredGroups.map(g => g.id);
    const allSelected = visible.every(id => selectedGroups.includes(id));
    if (allSelected) setSelectedGroups(prev => prev.filter(id => !visible.includes(id)));
    else setSelectedGroups(prev => [...new Set([...prev, ...visible])]);
  };

  const saveAndProceed = async () => {
    setSaving(true);
    const finalMediaUrl = mediaType === "link" ? linkUrl : (mediaUrl || "");
    const postStatus = scheduleMode === "later" ? "scheduled" : "draft";
    const post = await base44.entities.Post.create({
      original_content: originalContent,
      ai_versions: aiVersions,
      selected_version: selectedVersion,
      language_style: style,
      tone,
      target_groups: selectedGroups,
      status: postStatus,
      ai_suggestions: aiSuggestions,
      media_url: finalMediaUrl || undefined,
      scheduled_at: scheduleMode === "later" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    });
    setSaving(false);
    if (scheduleMode === "later") {
      navigate(createPageUrl("ScheduledPosts"));
    } else {
      navigate(createPageUrl("Campaigns") + `?post_id=${post.id}`);
    }
  };

  const displayMedia = mediaPreview || mediaUrl;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إنشاء منشور</h1>
          <p className="text-gray-500 text-sm">اكتب محتواك وسيتولى الذكاء الاصطناعي الباقي</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[{n:1,l:"كتابة المحتوى"},{n:2,l:"اختيار النسخة"},{n:3,l:"اختيار المجموعات"}].map(({n,l}) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= n ? "text-white" : "bg-gray-200 text-gray-500"}`}
              style={step >= n ? {background:"#6C5CE7"} : {}}>
              {n}
            </div>
            <span className={`text-sm font-medium hidden md:block ${step >= n ? "text-purple-700" : "text-gray-400"}`}>{l}</span>
            {n < 3 && <div className={`w-8 h-0.5 ${step > n ? "bg-purple-400" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">المحتوى الأصلي</label>
            <textarea value={originalContent} onChange={e => setOriginalContent(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
              rows={5} placeholder="الصق أو اكتب محتوى منشورك هنا..." />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-400">{originalContent.length} حرف</span>
            </div>

            {/* Media Section */}
            <div className="border-t pt-4 mt-4">
              <label className="block text-sm font-bold text-gray-700 mb-3">إضافة وسائط (اختياري)</label>
              {!mediaType ? (
                <div className="flex gap-2">
                  {[
                    {type:"image", icon:<ImageIcon className="w-5 h-5" />, label:"صورة"},
                    {type:"video", icon:<Video className="w-5 h-5" />, label:"فيديو"},
                    {type:"link",  icon:<Link2 className="w-5 h-5"  />, label:"رابط"},
                    {type:"ai_image", icon:<Sparkles className="w-5 h-5" />, label:"AI صورة"},
                  ].map(({type, icon, label}) => (
                    <button key={type} onClick={() => setMediaType(type)}
                      className="flex-1 flex flex-col items-center gap-1.5 py-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-colors text-gray-500 hover:text-purple-600">
                      {icon}
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border rounded-xl p-4 bg-gray-50 relative">
                  <button onClick={clearMedia} className="absolute top-2 left-2 p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {mediaType === "image" && (
                    <>
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      {!displayMedia ? (
                        <button onClick={() => fileRef.current?.click()} disabled={uploadingMedia}
                          className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-purple-200 rounded-xl hover:bg-purple-50">
                          {uploadingMedia ? <Loader2 className="w-6 h-6 animate-spin text-purple-500" /> : <Upload className="w-6 h-6 text-purple-400" />}
                          <span className="text-sm text-gray-500">{uploadingMedia ? "جاري الرفع..." : "انقر لرفع صورة"}</span>
                        </button>
                      ) : (
                        <div>
                          <div className="relative rounded-xl overflow-hidden">
                            <img src={displayMedia} className="w-full max-h-48 object-cover rounded-xl" alt="preview" />
                            {uploadingMedia && <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}
                          </div>
                          <button onClick={() => fileRef.current?.click()} className="mt-2 text-xs text-purple-600 hover:underline">تغيير الصورة</button>
                        </div>
                      )}
                    </>
                  )}
                  {mediaType === "video" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">رابط الفيديو (YouTube أو رابط مباشر)</label>
                      <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        placeholder="https://youtube.com/..." dir="ltr" />
                    </div>
                  )}
                  {mediaType === "link" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">رابط خارجي</label>
                      <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        placeholder="https://..." dir="ltr" />
                    </div>
                  )}
                  {mediaType === "ai_image" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">وصف الصورة المطلوبة</label>
                      <div className="flex gap-2">
                        <input value={aiImagePrompt} onChange={e => setAiImagePrompt(e.target.value)}
                          className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                          placeholder="مثال: منتج عصري على خلفية بيضاء نظيفة" />
                        <button onClick={generateAiImage} disabled={!aiImagePrompt.trim() || generatingImage}
                          className="btn-primary px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1">
                          {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {generatingImage ? 'جاري...' : 'توليد'}
                        </button>
                      </div>
                      {mediaPreview && (
                        <img src={mediaPreview} className="mt-3 w-full max-h-48 object-cover rounded-xl" alt="AI generated" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <label className="block text-sm font-bold text-gray-700 mb-3">اللهجة / الأسلوب</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => (
                  <button key={s} onClick={() => setStyle(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${style === s ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 text-gray-600 hover:border-purple-300"}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <label className="block text-sm font-bold text-gray-700 mb-3">نبرة المحتوى</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${tone === t ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 text-gray-600 hover:border-purple-300"}`}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={generateVersions} disabled={!originalContent.trim() || generating}
            className="w-full btn-primary py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 disabled:opacity-50">
            {generating ? <><Loader2 className="w-5 h-5 animate-spin" />جاري التوليد...</> : <><Wand2 className="w-5 h-5" />توليد نسخ بالذكاء الاصطناعي</>}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5">
          {aiSuggestions && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-700">اقتراحات الذكاء الاصطناعي</span>
              </div>
              <p className="text-sm text-amber-700 leading-relaxed">{aiSuggestions}</p>
            </div>
          )}

          {aiVersions.map((version, idx) => (
            <div key={idx} onClick={() => setSelectedVersion(version)}
              className={`bg-white rounded-2xl shadow-sm p-5 cursor-pointer border-2 transition-all ${selectedVersion === version ? "border-purple-500 shadow-purple-100 shadow-md" : "border-transparent hover:border-purple-200"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedVersion === version ? "border-purple-500 bg-purple-500" : "border-gray-300"}`}>
                    {selectedVersion === version && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className="text-sm font-bold text-gray-700">النسخة {idx + 1}</span>
                  {idx === 0 && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Star className="w-3 h-3" />مُوصى بها</span>}
                </div>
                <button onClick={e => { e.stopPropagation(); copyVersion(version, idx); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                  {copiedIdx === idx ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{version}</p>
            </div>
          ))}

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <label className="block text-sm font-bold text-gray-700 mb-2">أو حرّر النسخة المختارة</label>
            <textarea value={selectedVersion} onChange={e => setSelectedVersion(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" rows={4} />
          </div>

          {/* Preview with media */}
          {(displayMedia || linkUrl || mediaUrl) && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <label className="block text-sm font-bold text-gray-700 mb-3">📱 معاينة المنشور</label>
              <div className="border rounded-xl overflow-hidden max-w-sm mx-auto shadow-sm">
                <div className="p-3 bg-gray-50 border-b flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700">أ</div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">حسابك</p>
                    <p className="text-xs text-gray-400">الآن</p>
                  </div>
                </div>
                {mediaType === "image" && displayMedia && (
                  <img src={displayMedia} className="w-full max-h-56 object-cover" alt="post media" />
                )}
                <div className="p-3">
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedVersion}</p>
                  {linkUrl && <div className="mt-2 border rounded-lg p-2 bg-gray-50 text-xs text-blue-600 truncate">🔗 {linkUrl}</div>}
                  {mediaType === "video" && mediaUrl && <div className="mt-2 border rounded-lg p-2 bg-gray-50 text-xs text-blue-600 truncate">🎬 {mediaUrl}</div>}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border rounded-2xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />إعادة التوليد
            </button>
            <button onClick={() => setStep(3)} disabled={!selectedVersion} className="flex-2 btn-primary px-8 rounded-2xl py-3 text-sm font-bold disabled:opacity-50">
              التالي: اختيار المجموعات ←
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-purple-50 rounded-2xl p-4">
            <p className="text-sm font-medium text-purple-800">المنشور المختار:</p>
            <p className="text-sm text-purple-700 mt-1 line-clamp-3">{selectedVersion}</p>
            {mediaType === "image" && displayMedia && <img src={displayMedia} className="mt-2 w-20 h-14 object-cover rounded-lg" alt="" />}
            {linkUrl && <p className="text-xs text-purple-500 mt-1 truncate">🔗 {linkUrl}</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-bold text-gray-700">{selectedGroups.length} مجموعة محددة</span>
                <div className="flex gap-2">
                  <div className="flex bg-gray-100 rounded-xl overflow-hidden text-xs">
                    {["all","facebook","whatsapp"].map(p => (
                      <button key={p} onClick={() => setFilterPlatform(p)}
                        className={`px-3 py-1.5 font-medium transition-colors ${filterPlatform === p ? "bg-purple-600 text-white" : "text-gray-600"}`}>
                        {p === "all" ? "الكل" : p === "facebook" ? "FB" : "WA"}
                      </button>
                    ))}
                  </div>
                  <button onClick={selectAll} className="px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-200">
                    {filteredGroups.every(g => selectedGroups.includes(g.id)) ? "إلغاء الكل" : "تحديد الكل"}
                  </button>
                </div>
              </div>
              <input value={searchGroup} onChange={e => setSearchGroup(e.target.value)} placeholder="بحث في المجموعات..." className="mt-3 w-full border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div className="max-h-80 overflow-y-auto divide-y">
              {filteredGroups.map(g => (
                <div key={g.id} onClick={() => toggleGroup(g.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedGroups.includes(g.id) ? "bg-purple-50" : ""}`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedGroups.includes(g.id) ? "bg-purple-500 border-purple-500" : "border-gray-300"}`}>
                    {selectedGroups.includes(g.id) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${g.platform === "facebook" ? "badge-fb" : "badge-wa"}`}>
                    {g.platform === "facebook" ? <Facebook className="w-4 h-4" style={{color:"#1877F2"}} /> : <MessageCircle className="w-4 h-4" style={{color:"#25D366"}} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.category} {g.member_count ? `• ${g.member_count.toLocaleString()} عضو` : ""}</p>
                  </div>
                  {g.activity_level === "high" && <span className="text-xs text-green-600 flex-shrink-0">⭐</span>}
                  {g.activity_level === "low" && <span className="text-xs text-red-400 flex-shrink-0">⚠️</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Schedule mode */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <label className="block text-sm font-bold text-gray-700 mb-3">موعد النشر</label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => setScheduleMode("now")}
                className={`py-3 rounded-xl border-2 text-center transition-all ${scheduleMode === "now" ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-200"}`}>
                <Send className={`w-4 h-4 mx-auto mb-1 ${scheduleMode === "now" ? "text-purple-600" : "text-gray-400"}`} />
                <p className={`text-sm font-bold ${scheduleMode === "now" ? "text-purple-700" : "text-gray-600"}`}>الآن</p>
                <p className={`text-xs ${scheduleMode === "now" ? "text-purple-500" : "text-gray-400"}`}>إطلاق حملة فوراً</p>
              </button>
              <button onClick={() => setScheduleMode("later")}
                className={`py-3 rounded-xl border-2 text-center transition-all ${scheduleMode === "later" ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-200"}`}>
                <Clock className={`w-4 h-4 mx-auto mb-1 ${scheduleMode === "later" ? "text-purple-600" : "text-gray-400"}`} />
                <p className={`text-sm font-bold ${scheduleMode === "later" ? "text-purple-700" : "text-gray-600"}`}>جدولة</p>
                <p className={`text-xs ${scheduleMode === "later" ? "text-purple-500" : "text-gray-400"}`}>اختر وقت لاحق</p>
              </button>
            </div>
            {scheduleMode === "later" && (
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                min={new Date().toISOString().slice(0,16)} />
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-6 border rounded-2xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">رجوع</button>
            <button onClick={saveAndProceed} disabled={selectedGroups.length === 0 || saving || (scheduleMode === "later" && !scheduledAt)}
              className="flex-1 btn-primary rounded-2xl py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الحفظ...</> : 
               scheduleMode === "later" ? <><Clock className="w-4 h-4" />جدولة المنشور</> :
               <>إنشاء خطة النشر ← ({selectedGroups.length} مجموعة)</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}