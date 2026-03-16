import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle2, Circle, Loader2 } from "lucide-react";

type AdminTask = {
  id: string;
  content: string;
  is_completed: boolean;
  created_at: string;
};

const AdminTasksTab = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskContent, setNewTaskContent] = useState("");
  const [adding, setAdding] = useState(false);

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from("admin_tasks" as any)
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast({ title: "Görevler yüklenemedi", description: error.message, variant: "destructive" });
    } else {
      setTasks((data as unknown as AdminTask[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent.trim()) return;

    setAdding(true);
    try {
      const { error } = await (supabase.from("admin_tasks" as any) as any).insert({
        content: newTaskContent.trim(),
      });

      if (error) throw error;

      toast({ title: "Görev eklendi" });
      setNewTaskContent("");
      loadTasks();
    } catch (err: any) {
      toast({ title: "Görev eklenirken hata oluştu", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const toggleTaskCompletion = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase
        .from("admin_tasks" as any) as any)
        .update({ is_completed: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
    } catch (err: any) {
      toast({ title: "Güncelleme hatası", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await (supabase.from("admin_tasks" as any) as any).delete().eq("id", id);
      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== id));
      toast({ title: "Görev silindi" });
    } catch (err: any) {
      toast({ title: "Silme hatası", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const completedCount = tasks.filter(t => t.is_completed).length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Görevler & Notlar</h2>
          <p className="text-sm text-muted-foreground">Admin ekibi için ortak yapılacaklar listesi.</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {completedCount} / {tasks.length} Tamamlandı
        </Badge>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="flex gap-2">
        <Input
          placeholder="Yeni bir görev veya not ekleyin..."
          value={newTaskContent}
          onChange={(e) => setNewTaskContent(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={adding || !newTaskContent.trim()} className="gap-2">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Ekle
        </Button>
      </form>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <p className="text-muted-foreground">Henüz bir görev eklenmemiş.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className={`transition-all ${task.is_completed ? "opacity-60 bg-muted/30" : "bg-card hover:shadow-sm"}`}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <button 
                    onClick={() => toggleTaskCompletion(task.id, task.is_completed)}
                    className="shrink-0 text-primary hover:scale-110 transition-transform"
                  >
                    {task.is_completed ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </button>
                  <span className={`text-sm md:text-base leading-relaxed ${task.is_completed ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                    {task.content}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:block">
                    {new Date(task.created_at).toLocaleDateString("tr-TR")}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminTasksTab;
