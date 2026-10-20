"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  ShieldCheck,
  Calendar,
  CheckCircle,
  Loader2,
  CornerDownRight,
  User,
  Heart
} from "lucide-react";

interface BlogCommentsProps {
  postId: string;
  postTitle?: string;
}

export type BlogComment = {
  id: string;
  post_id: string;
  user_name: string;
  user_email: string | null;
  content: string;
  is_approved: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
};

export default function BlogComments({ postId, postTitle }: BlogCommentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Anti-spam bot trap
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch approved comments for this post
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["blog-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_comments")
        .select("*")
        .eq("post_id", postId)
        .eq("is_approved", true)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching blog comments:", error);
        return [];
      }
      return (data as BlogComment[]) || [];
    },
    enabled: !!postId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Spam bot check
    if (honeypot) return;

    if (!userName.trim() || !content.trim()) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen adınızı ve yorumunuzu doldurunuz.",
        variant: "destructive",
      });
      return;
    }

    if (content.trim().length < 5) {
      toast({
        title: "Yorum Çok Kısa",
        description: "Lütfen en az 5 karakterlik bir yorum yazınız.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("blog_comments").insert({
        post_id: postId,
        user_name: userName.trim(),
        user_email: userEmail.trim() || null,
        content: content.trim(),
        is_approved: true, // Default to true so it appears immediately
      });

      if (error) throw error;

      setSubmitted(true);
      setUserName("");
      setUserEmail("");
      setContent("");
      toast({
        title: "Yorumunuz Paylaşıldı!",
        description: "Yorumunuz için teşekkür ederiz.",
      });

      // Refetch comments
      queryClient.invalidateQueries({ queryKey: ["blog-comments", postId] });
    } catch (err) {
      console.error("Error posting comment:", err);
      toast({
        title: "Hata Oluştu",
        description: "Yorum kaydedilirken bir hata oluştu, lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section id="blog-comments" className="mt-16 pt-12 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-2xl font-bold text-foreground">
              Yorumlar ({comments.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              Fikirlerinizi ve sorularınızı paylaşın
            </p>
          </div>
        </div>
      </div>

      {/* Comment List */}
      <div className="space-y-6 mb-12">
        {isLoading ? (
          <div className="py-8 flex justify-center items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Yorumlar yükleniyor...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-3xl bg-muted/30 border border-dashed border-border/80">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground">İlk yorumu siz yapın!</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Bu yazı hakkında soru sormak veya görüşlerinizi belirtmek için aşağıdaki formu doldurabilirsiniz.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-card rounded-2xl p-6 border border-border/80 shadow-sm transition-all hover:shadow-md"
            >
              {/* Commenter info */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center justify-center uppercase text-sm border border-emerald-200">
                    {comment.user_name.charAt(0) || "U"}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-base leading-tight">
                      {comment.user_name}
                    </h4>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comment content */}
              <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap pl-13">
                {comment.content}
              </p>

              {/* Admin Reply */}
              {comment.admin_reply && (
                <div className="mt-4 pt-4 border-t border-border/60">
                  <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-5 border border-primary/20">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground gap-1.5 px-2.5 py-0.5 text-xs font-semibold shadow-sm">
                          <ShieldCheck className="h-3.5 w-3.5" /> Peyzajbul Editörü
                        </Badge>
                        <span className="text-xs font-medium text-primary">Cevapladı</span>
                      </div>
                      {comment.admin_reply_at && (
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(comment.admin_reply_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap mt-2">
                      {comment.admin_reply}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Comment Form Card */}
      <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h4 className="font-heading text-xl font-bold text-foreground">
            Yorum Yapın
          </h4>
        </div>

        {submitted ? (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center space-y-3 animate-in fade-in duration-300">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h5 className="font-bold text-emerald-900 dark:text-emerald-200 text-lg">
              Yorumunuz için teşekkürler!
            </h5>
            <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80 max-w-md mx-auto">
              Yorumunuz başarıyla yayınlandı. Editörlerimiz sorularınızı en kısa sürede yanıtlayacaktır.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmitted(false)}
              className="mt-2 rounded-full border-emerald-300 hover:bg-emerald-100"
            >
              Yeni Bir Yorum Yap
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot field for bots (hidden from real users) */}
            <input
              type="text"
              name="company_website_url_check"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden opacity-0 absolute -z-10"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="comment-name" className="text-sm font-medium">
                  Adınız Soyadınız <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="comment-name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                  className="rounded-xl h-11"
                  maxLength={60}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="comment-email" className="text-sm font-medium">
                    E-posta Adresiniz
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Yayınlanmayacaktır</span>
                </div>
                <Input
                  id="comment-email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  className="rounded-xl h-11"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comment-content" className="text-sm font-medium">
                Yorumunuz <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="comment-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Yazı hakkındaki düşüncelerinizi, deneyimlerinizi veya sormak istediğiniz soruları buraya yazabilirsiniz..."
                rows={4}
                required
                className="rounded-2xl resize-y min-h-[110px]"
                maxLength={2000}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Gönderilen yorumlar topluluk kurallarına uygun olmalıdır.
              </p>
              <Button
                type="submit"
                disabled={submitting || !userName.trim() || !content.trim()}
                className="gap-2 rounded-xl px-6 h-11 shadow-md hover:shadow-lg transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Yorumu Gönder
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
