import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function FacebookCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("جاري ربط حساب فيسبوك...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setMessage("تم رفض الصلاحيات من فيسبوك");
      setTimeout(() => navigate(createPageUrl("CommentsMonitor")), 3000);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("لم يتم استلام رمز التفويض");
      setTimeout(() => navigate(createPageUrl("CommentsMonitor")), 3000);
      return;
    }

    const redirect_uri = `${window.location.origin}${createPageUrl("FacebookCallback")}`;

    base44.functions.invoke("facebookAuth", {
      action: "exchange_token",
      code,
      redirect_uri
    }).then(res => {
      if (res.data?.success) {
        setStatus("success");
        setMessage(`تم الربط بنجاح! مرحباً ${res.data.name} 🎉`);
        setTimeout(() => navigate(createPageUrl("CommentsMonitor")), 2000);
      } else {
        setStatus("error");
        setMessage(res.data?.error || "حدث خطأ أثناء الربط");
        setTimeout(() => navigate(createPageUrl("CommentsMonitor")), 3000);
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full mx-4">
        {status === "loading" && <Loader2 className="w-14 h-14 animate-spin text-purple-600 mx-auto mb-4" />}
        {status === "success" && <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />}
        {status === "error" && <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />}
        <p className="text-gray-700 font-medium text-lg">{message}</p>
        <p className="text-gray-400 text-sm mt-2">سيتم تحويلك تلقائياً...</p>
      </div>
    </div>
  );
}