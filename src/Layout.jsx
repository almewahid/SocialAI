import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, Users, FileText, Megaphone, 
  BarChart3, Settings, Zap, Menu, X, Calendar, MessageSquare, Clock
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { name: "لوحة التحكم", page: "Dashboard", icon: LayoutDashboard },
  { name: "المجموعات", page: "Groups", icon: Users },
  { name: "إنشاء منشور", page: "CreatePost", icon: FileText },
  { name: "الحملات", page: "Campaigns", icon: Megaphone },
  { name: "تقويم النشر", page: "PostCalendar", icon: Calendar },
  { name: "التقارير", page: "Reports", icon: BarChart3 },
  { name: "التعليقات", page: "CommentsMonitor", icon: MessageSquare },
  { name: "المنشورات", page: "ScheduledPosts", icon: Clock },
  { name: "الإعدادات", page: "SettingsPage", icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex" style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      <style>{`
        :root {
          --primary: #6C5CE7;
          --primary-dark: #5A4BD1;
          --secondary: #00B894;
          --accent: #FDCB6E;
          --facebook: #1877F2;
          --whatsapp: #25D366;
          --danger: #E17055;
        }
        .gradient-bg { background: linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%); }
        .sidebar-item { transition: all 0.2s ease; }
        .sidebar-item:hover { background: rgba(108,92,231,0.1); color: #6C5CE7; }
        .sidebar-item.active { background: rgba(108,92,231,0.15); color: #6C5CE7; border-right: 3px solid #6C5CE7; }
        .card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(108,92,231,0.15); }
        .btn-primary { background: #6C5CE7; color: white; transition: all 0.2s; }
        .btn-primary:hover { background: #5A4BD1; }
        .badge-fb { background: #E8F0FE; color: #1877F2; }
        .badge-wa { background: #E8F8EF; color: #25D366; }
        @media (max-width: 768px) {
          .sidebar-desktop { display: none; }
          .sidebar-mobile { display: flex; }
        }
        @media (min-width: 769px) {
          .sidebar-mobile { display: none; }
          .sidebar-desktop { display: flex; }
        }
      `}</style>

      {/* Sidebar Desktop */}
      <aside className="sidebar-desktop w-64 bg-white shadow-lg flex-col flex-shrink-0 fixed h-full z-10">
        <div className="gradient-bg p-4 flex justify-center">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6" style={{ color: "#6C5CE7" }} />
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 ${currentPageName === item.page ? "active" : ""}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="sidebar-mobile fixed top-0 right-0 left-0 z-20 bg-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-gray-600">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: "#6C5CE7" }} />
            <span className="font-bold text-gray-800">SocialAI Pro</span>
          </div>
          <div className="w-9" />
        </div>
        {sidebarOpen && (
          <div className="bg-white border-t pb-4 px-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 ${currentPageName === item.page ? "active" : ""}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 md:mr-64 mt-0 md:mt-0">
        <div className="md:hidden h-16" />
        {children}
      </main>
    </div>
  );
}