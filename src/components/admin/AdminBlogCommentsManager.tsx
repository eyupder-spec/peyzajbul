"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Reply,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Loader2,
  RefreshCw,
  Clock
} from "lucide-react";
import Link from "next/link";

export type AdminBlogComment = {
  id: string;
  post_id: string;
  user_name: string;
  user_email: string | null;
  content: string;
  is_approved: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
  blog_posts?: {
    id: string;
    title: string;
    slug: string;
  } | null;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Beklenmeyen bir hata oluştu.";
};

interface AdminBlogCommentsManagerProps {
  initialPostId?: string;
  onClosePostFilter?: () => void;
}

export default function AdminBlogCommentsManager({
  initialPostId,
  onClosePostFilter,
}: AdminBlogCommentsManagerProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<AdminBlogComment[]>([]);
  const [posts, setPosts] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string>(initialPostId || "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Reply dialog state
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<AdminBlogComment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch comments with blog post info
      const { data: commentsData, error: commentsErr } = await supabase
        .from("blog_comments")
        .select(`
          *,
          blog_posts (
            id,
            title,
            slug
          )
        `)
        .order("created_at", { ascending: false });

      if (commentsErr) {
        console.error("Error loading blog comments:", commentsErr);
      } else {
        setComments(commentsData || []);
      }

      // 2. Fetch all posts for filter dropdown
      const { data: postsData } = await supabase
        .from("blog_posts")
        .select("id, title, slug")
        .order("title");

      setPosts(postsData || []);
    } catch (e) {
      console.error(e);
      toast({
        title: "Hata",
        description: "Yorumlar yüklenirken bir problem oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialPostId) {
      setSelectedPostId(initialPostId);
    }
  }, [initialPostId]);

  // Toggle approval
  const handleToggleApproval = async (comment: AdminBlogComment) => {
    try {
      const nextStatus = !comment.is_approved;
      const { error } = await supabase
        .from("blog_comments")
        .update({ is_approved: nextStatus })
        .eq("id", comment.id);

      if (error) throw error;

      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, is_approved: nextStatus } : c))
      );

      toast({
        title: nextStatus ? "Yorum Onaylandı" : "Yorum Gizlendi",
        description: nextStatus ? "Yorum artık sitede görünecektir." : "Yorum yayından kaldırıldı.",
      });
    } catch (err) {
      toast({
        title: "Hata",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  // Open reply dialog
  const openReplyDialog = (comment: AdminBlogComment) => {
    setSelectedComment(comment);
    setReplyText(comment.admin_reply || "");
    setReplyDialogOpen(true);
  };

  // Save reply
  const handleSaveReply = async () => {
    if (!selectedComment) return;
    setSavingReply(true);

    try {
      const trimmedReply = replyText.trim();
      const payload = {
        admin_reply: trimmedReply || null,
        admin_reply_at: trimmedReply ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from("blog_comments")
        .update(payload)
        .eq("id", selectedComment.id);

      if (error) throw error;

      setComments((prev) =>
        prev.map((c) =>
          c.id === selectedComment.id
            ? { ...c, admin_reply: payload.admin_reply, admin_reply_at: payload.admin_reply_at }
            : c
        )
      );

      toast({
        title: trimmedReply ? "Cevap Kaydedildi" : "Cevap Silindi",
        description: trimmedReply ? "Yanıtnız blog yazısında yayınlandı." : "Yönetici cevabı kaldırıldı.",
      });

      setReplyDialogOpen(false);
      setSelectedComment(null);
    } catch (err) {
      toast({
        title: "Hata",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSavingReply(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (id: string) => {
    if (!window.confirm("Bu yorumu tamamen silmek istediğinize emin misiniz?")) return;

    try {
      const { error } = await supabase.from("blog_comments").delete().eq("id", id);
      if (error) throw error;

      setComments((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Yorum Silindi" });
    } catch (err) {
      toast({
        title: "Hata",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    }
  };

  // Filtered comments
  const filteredComments = comments.filter((c) => {
    if (selectedPostId !== "all" && c.post_id !== selectedPostId) return false;
    if (statusFilter === "approved" && !c.is_approved) return false;
    if (statusFilter === "unapproved" && c.is_approved) return false;
    if (statusFilter === "with_reply" && !c.admin_reply) return false;
    if (statusFilter === "no_reply" && c.admin_reply) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.user_name.toLowerCase().includes(q);
      const matchEmail = (c.user_email || "").toLowerCase().includes(q);
      const matchContent = c.content.toLowerCase().includes(q);
      const matchPost = (c.blog_posts?.title || "").toLowerCase().includes(q);
      const matchReply = (c.admin_reply || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchContent || matchPost || matchReply;
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Yorum, yazar, e-posta ara..."
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          {/* Post Filter */}
          <Select value={selectedPostId} onValueChange={setSelectedPostId}>
            <SelectTrigger className="w-full sm:w-[240px] h-10 rounded-xl">
              <SelectValue placeholder="Tüm Yazılar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Blog Yazıları</SelectItem>
              {posts.map((p) => (
                <SelectItem key={p.id} value={p.id} className="truncate max-w-[320px]">
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[170px] h-10 rounded-xl">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="approved">Onaylılar</SelectItem>
              <SelectItem value="unapproved">Gizlenenler</SelectItem>
              <SelectItem value="no_reply">Cevapsızlar</SelectItem>
              <SelectItem value="with_reply">Cevaplananlar</SelectItem>
            </SelectContent>
          </Select>

          {selectedPostId !== "all" && onClosePostFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPostId("all");
                onClosePostFilter();
              }}
              className="h-10 rounded-xl text-xs"
            >
              Filtreyi Temizle
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="h-10 rounded-xl gap-2 self-end sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/70 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-medium">Toplam Yorum</p>
          <p className="text-2xl font-bold text-foreground mt-1">{comments.length}</p>
        </div>
        <div className="bg-card border border-border/70 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-medium">Onaylı Yorumlar</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {comments.filter((c) => c.is_approved).length}
          </p>
        </div>
        <div className="bg-card border border-border/70 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-medium">Cevaplananlar</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {comments.filter((c) => !!c.admin_reply).length}
          </p>
        </div>
        <div className="bg-card border border-border/70 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-medium">Cevap Bekleyenler</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {comments.filter((c) => !c.admin_reply).length}
          </p>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Yorumlar yükleniyor...</p>
        </div>
      ) : filteredComments.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-muted/20 border border-dashed border-border">
          <MessageSquare className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
          <p className="font-semibold text-foreground">Yorum bulunamadı</p>
          <p className="text-xs text-muted-foreground mt-1">
            Seçili filtrelere uygun herhangi bir blog yorumu bulunmamaktadır.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-2xl border p-5 transition-all bg-card shadow-sm ${
                !comment.is_approved ? "border-amber-300 bg-amber-50/20 dark:bg-amber-950/10" : "border-border"
              }`}
            >
              {/* Header info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-foreground text-sm">
                    {comment.user_name}
                  </span>
                  {comment.user_email && (
                    <span className="text-xs text-muted-foreground">
                      ({comment.user_email})
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(comment.created_at)}
                  </span>
                  <Badge variant={comment.is_approved ? "default" : "secondary"} className="text-[10px] px-2 py-0">
                    {comment.is_approved ? "Yayında" : "Gizlendi"}
                  </Badge>
                  {comment.admin_reply && (
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary gap-1 px-2 py-0">
                      <ShieldCheck className="h-3 w-3" /> Cevaplandı
                    </Badge>
                  )}
                </div>

                {/* Post Link */}
                {comment.blog_posts && (
                  <Link
                    href={`/blog/${comment.blog_posts.slug}`}
                    target="_blank"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium truncate max-w-xs"
                  >
                    <span>{comment.blog_posts.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                )}
              </div>

              {/* Comment Body */}
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap mb-4 bg-muted/30 p-3.5 rounded-xl border border-border/50">
                {comment.content}
              </p>

              {/* Existing Admin Reply preview */}
              {comment.admin_reply && (
                <div className="mb-4 pl-4 border-l-2 border-primary space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Yönetici Cevabı
                    </span>
                    {comment.admin_reply_at && (
                      <span className="text-[10px] text-muted-foreground">
                        ({formatDate(comment.admin_reply_at)})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {comment.admin_reply}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={comment.admin_reply ? "outline" : "default"}
                    onClick={() => openReplyDialog(comment)}
                    className="h-8 rounded-xl text-xs gap-1.5"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    {comment.admin_reply ? "Cevabı Düzenle" : "Cevap Yaz"}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleApproval(comment)}
                    className="h-8 rounded-xl text-xs gap-1"
                  >
                    {comment.is_approved ? (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-amber-500" />
                        <span>Gizle</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Onayla</span>
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl text-xs gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Sil</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Yoruma Cevap Yaz
            </DialogTitle>
            <DialogDescription>
              Bu cevap blog yazısının altında &quot;Peyzajbul Editörü&quot; etiketiyle yorumun hemen altında gösterilecektir.
            </DialogDescription>
          </DialogHeader>

          {selectedComment && (
            <div className="space-y-4 py-2">
              {/* User comment context */}
              <div className="bg-muted/50 p-4 rounded-2xl border border-border/70 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>{selectedComment.user_name}</span>
                  <span>{formatDate(selectedComment.created_at)}</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed italic">
                  &ldquo;{selectedComment.content}&rdquo;
                </p>
              </div>

              {/* Reply Textarea */}
              <div className="space-y-2">
                <Label htmlFor="admin-reply-text" className="text-sm font-semibold">
                  Yönetici Yanıtınız
                </Label>
                <Textarea
                  id="admin-reply-text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Kullanıcıya nazik ve bilgilendirici bir yanıt yazın..."
                  rows={5}
                  className="rounded-2xl resize-y"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedComment?.admin_reply && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setReplyText("");
                  setTimeout(() => handleSaveReply(), 50);
                }}
                disabled={savingReply}
                className="rounded-xl text-xs"
              >
                Cevabı Kaldır
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => setReplyDialogOpen(false)}
              disabled={savingReply}
              className="rounded-xl text-xs"
            >
              İptal
            </Button>
            <Button
              type="button"
              onClick={handleSaveReply}
              disabled={savingReply}
              className="rounded-xl text-xs gap-1.5"
            >
              {savingReply ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Reply className="h-3.5 w-3.5" />
                  Cevabı Yayınla
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
