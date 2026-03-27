import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Zap, Home } from "lucide-react";

export default function PageNotFound() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
          <Zap className="w-10 h-10 text-purple-600" />
        </div>
        <h1 className="text-6xl font-black text-purple-600 mb-2">404</h1>
        <h2 className="text-xl font-bold text-gray-800 mb-3">الصفحة غير موجودة</h2>
        <p className="text-gray-500 mb-8">عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
        <Link to={createPageUrl("Dashboard")}
          className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors">
          <Home className="w-5 h-5" />
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}