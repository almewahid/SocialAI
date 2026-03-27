import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ChevronLeft, ChevronRight, Calendar, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const toDateStr = (date) =>
  `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

export default function PostCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [posts, setPosts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [p, c] = await Promise.all([
      base44.entities.Post.list("-created_date", 200),
      base44.entities.Campaign.list("-created_date", 100),
    ]);
    setPosts(p.filter(post => post.scheduled_at));
    setCampaigns(c.filter(c => (c.schedule_plan || []).length > 0));
    setLoading(false);
  };

  const getDaysGrid = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
    return grid;
  };

  const getPostsForDay = (day) => {
    if (!day) return [];
    const ds = toDateStr(day);
    return posts.filter(p => p.scheduled_at && p.scheduled_at.startsWith(ds));
  };

  const getCampaignsForDay = (day) => {
    if (!day) return [];
    const ds = toDateStr(day);
    return campaigns.filter(c => {
      const plan = c.schedule_plan || [];
      const first = plan.find(p => p.status === "pending")?.scheduled_time || plan[0]?.scheduled_time;
      return first && first.startsWith(ds);
    });
  };

  const onDragEnd = async ({ draggableId, destination, source }) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    if (!draggableId.startsWith("post-")) return;
    const postId = draggableId.replace("post-", "");
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const [y, m, d] = destination.droppableId.replace("day-", "").split("-").map(Number);
    const existing = new Date(post.scheduled_at);
    const newDate = new Date(y, m - 1, d, existing.getHours(), existing.getMinutes());
    await base44.entities.Post.update(postId, { scheduled_at: newDate.toISOString() });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, scheduled_at: newDate.toISOString() } : p));
  };

  const todayStr = toDateStr(new Date());
  const grid = getDaysGrid(currentMonth);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">تقويم النشر</h1>
          <p className="text-gray-500 text-sm">اسحب المنشورات لتغيير مواعيدها</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl("CreatePost")} className="btn-primary flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium">
            <Plus className="w-4 h-4" />منشور
          </Link>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1))} className="p-2 rounded-xl hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
          <span className="font-bold text-gray-700 w-32 text-center text-sm">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1))} className="p-2 rounded-xl hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-3 h-3 rounded-full" style={{background:"#6C5CE7"}} />منشور مجدول</div>
        <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-3 h-3 rounded-full" style={{background:"#00B894"}} />حملة</div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="h-24 rounded-xl bg-gray-50 opacity-40" />;
            const ds = toDateStr(day);
            const dayPosts = getPostsForDay(day);
            const dayCampaigns = getCampaignsForDay(day);
            const isToday = ds === todayStr;
            return (
              <Droppable key={ds} droppableId={`day-${ds}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-24 rounded-xl p-1.5 transition-all border ${snapshot.isDraggingOver ? "bg-purple-50 border-2 border-purple-300" : "bg-white border-gray-100"}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${isToday ? "text-white" : "text-gray-500"}`}
                      style={isToday ? {background:"#6C5CE7"} : {}}>
                      {day.getDate()}
                    </div>
                    {dayPosts.map((post, i) => (
                      <Draggable key={`post-${post.id}`} draggableId={`post-${post.id}`} index={i}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            onClick={() => setSelectedEvent({type:"post", data:post})}
                            className={`text-xs p-1 rounded-lg mb-0.5 text-white truncate cursor-grab ${snap.isDragging ? "shadow-xl opacity-90" : ""}`}
                            style={{background:"#6C5CE7", ...prov.draggableProps.style}}
                            title={post.selected_version || post.original_content}
                          >
                            📝 {(post.selected_version || post.original_content || "منشور").slice(0, 14)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {dayCampaigns.map(c => (
                      <div key={c.id} onClick={() => setSelectedEvent({type:"campaign", data:c})}
                        className="text-xs p-1 rounded-lg mb-0.5 text-white truncate cursor-pointer"
                        style={{background:"#00B894"}}>
                        📢 {c.name.slice(0, 14)}
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {posts.length === 0 && campaigns.length === 0 && (
        <div className="text-center py-16 mt-4">
          <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">لا توجد منشورات مجدولة</p>
          <p className="text-gray-400 text-sm mt-1">أنشئ منشوراً وجدوله لتراه هنا</p>
          <Link to={createPageUrl("CreatePost")} className="mt-4 inline-block btn-primary px-5 py-2 rounded-xl text-sm font-medium">إنشاء منشور</Link>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            {selectedEvent.type === "post" ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm" style={{background:"#6C5CE7"}}>📝</div>
                  <h3 className="font-bold text-gray-800">تفاصيل المنشور</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">{selectedEvent.data.selected_version || selectedEvent.data.original_content}</p>
                {selectedEvent.data.scheduled_at && (
                  <p className="text-xs text-gray-400">📅 {new Date(selectedEvent.data.scheduled_at).toLocaleString("ar")}</p>
                )}
                {selectedEvent.data.media_url && (
                  <img src={selectedEvent.data.media_url} className="mt-3 w-full rounded-xl object-cover max-h-40" alt="media" />
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm" style={{background:"#00B894"}}>📢</div>
                  <h3 className="font-bold text-gray-800">{selectedEvent.data.name}</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{selectedEvent.data.total_groups} مجموعة • {selectedEvent.data.sent_count} تم إرسالها</p>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{width:`${selectedEvent.data.total_groups > 0 ? (selectedEvent.data.sent_count/selectedEvent.data.total_groups)*100 : 0}%`, background:"#00B894"}} />
                  </div>
                </div>
              </>
            )}
            <button onClick={() => setSelectedEvent(null)} className="mt-4 w-full border rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}