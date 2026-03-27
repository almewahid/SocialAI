import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Settings, Save, Bell, Globe, Clock, MessageCircle,
  Loader2, CheckCircle, Zap, Smartphone
} from "lucide-react";

const STYLES = ["فصحى", "عامية", "خليجي", "مصري", "شامي"];
const TONES = ["رسمي", "ودي", "تسويقي", "تعليمي", "ترفيهي"];

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    default_language: "عامية",
    default_tone: "تسويقي",
    delay_between_posts: 5,
    whatsapp_number: "",
    weekly_report_enabled: true,
    notifications_enabled: true,
  });

  useEffect(() => {
    base44.entities.Settings.list().then(data => {
      if (data.length > 0) {
        setSettings(data[0]);
        setSettingsId(data[0].id);
        setForm({ ...form, ...data[0] });
      }
      setLoading(false);
    });
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    if (settingsId) {
      await base44.entities.Settings.update(settingsId, form);
    } else {
      const s = await base44.entities.Settings.create(form);
      setSettingsId(s.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Settings className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الإعدادات</h1>
          <p className="text-gray-500 text-sm">تخصيص تجربتك في التطبيق</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* AI Content Settings */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Zap className="w-5 h-5 text-purple-600" />
            <h2 className="font-bold text-gray-800">إعدادات الذكاء الاصطناعي</h2>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اللهجة الافتراضية</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => (
                  <button key={s} onClick={() => setForm({ ...form, default_language: s })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${form.default_language === s ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 text-gray-600 hover:border-purple-300"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نبرة المحتوى الافتراضية</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                  <button key={t} onClick={() => setForm({ ...form, default_tone: t })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${form.default_tone === t ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 text-gray-600 hover:border-purple-300"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Publishing Settings */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-800">إعدادات النشر</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              التأخير الافتراضي بين المنشورات: <strong className="text-purple-700">{form.delay_between_posts} دقيقة</strong>
            </label>
            <input type="range" min="1" max="60" value={form.delay_between_posts}
              onChange={e => setForm({ ...form, delay_between_posts: Number(e.target.value) })}
              className="w-full accent-purple-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 دقيقة</span><span>30 دقيقة</span><span>60 دقيقة</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              ⚠️ يُنصح بعدم تقليل الفترة عن 3-5 دقائق لتجنب الحظر من فيسبوك وواتساب
            </p>
          </div>
        </div>

        {/* WhatsApp Settings */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-gray-800">إعدادات واتساب</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم واتساب (لاستلام التقارير)</label>
            <input
              value={form.whatsapp_number}
              onChange={e => setForm({ ...form, whatsapp_number: e.target.value })}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="مثال: 201012345678+"
              dir="ltr"
            />
            <p className="text-xs text-gray-400 mt-1">أدخل الرقم مع كود الدولة</p>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="w-5 h-5 text-orange-600" />
            <h2 className="font-bold text-gray-800">الإشعارات والتقارير</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">تقارير أسبوعية تلقائية</p>
                <p className="text-xs text-gray-400">يرسل تقريراً أسبوعياً تلقائياً</p>
              </div>
              <button onClick={() => setForm({ ...form, weekly_report_enabled: !form.weekly_report_enabled })}
                className={`w-12 h-6 rounded-full transition-colors relative ${form.weekly_report_enabled ? "bg-purple-600" : "bg-gray-200"}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${form.weekly_report_enabled ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">إشعارات التطبيق</p>
                <p className="text-xs text-gray-400">تنبيهات عند اكتمال الحملات</p>
              </div>
              <button onClick={() => setForm({ ...form, notifications_enabled: !form.notifications_enabled })}
                className={`w-12 h-6 rounded-full transition-colors relative ${form.notifications_enabled ? "bg-purple-600" : "bg-gray-200"}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${form.notifications_enabled ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-6 h-6 text-yellow-300" />
            <h2 className="font-bold text-lg">SocialAI Pro</h2>
          </div>
          <p className="text-purple-200 text-sm leading-relaxed">
            مدير التسويق الذكي لمجموعات فيسبوك وواتساب. مدعوم بالذكاء الاصطناعي لمساعدتك على النشر بذكاء وكفاءة.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-purple-300">
            <Smartphone className="w-4 h-4" />
            <span>متوافق مع الجوال والحاسوب</span>
          </div>
        </div>

        {/* Save Button */}
        <button onClick={saveSettings} disabled={saving}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-colors disabled:opacity-50 ${saved ? "bg-green-500 text-white" : "btn-primary"}`}>
          {saving ? <><Loader2 className="w-5 h-5 animate-spin" />جاري الحفظ...</>
            : saved ? <><CheckCircle className="w-5 h-5" />تم الحفظ!</>
            : <><Save className="w-5 h-5" />حفظ الإعدادات</>}
        </button>
      </div>
    </div>
  );
}