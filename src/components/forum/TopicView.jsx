import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ThumbsUp, 
  MessageSquare, 
  CheckCircle2, 
  Pin,
  Lock,
  Unlock,
  Trash2,
  Award,
  Send,
  MoreVertical,
  ArrowLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ForumTopic } from "@/entities/ForumTopic";
import { ForumReply } from "@/entities/ForumReply";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TopicView({ open, onClose, topic, currentUser, users, isAdmin, onUpdate }) {
  const { toast } = useToast();
  const [replies, setReplies] = useState([]);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && topic) {
      loadReplies();
      incrementViews();
    }
  }, [open, topic]);

  const loadReplies = async () => {
    setLoading(true);
    try {
      const data = await ForumReply.filter({ topic_id: topic.id }, "created_date");
      setReplies(data);
    } catch (error) {
      console.error("Erro ao carregar respostas:", error);
    }
    setLoading(false);
  };

  const incrementViews = async () => {
    try {
      await ForumTopic.update(topic.id, { 
        views_count: (topic.views_count || 0) + 1 
      });
    } catch (error) {
      console.error("Erro ao incrementar views:", error);
    }
  };

  const getUserInfo = (email) => {
    const user = users.find(u => u.email === email);
    return {
      name: user?.display_name || user?.full_name || email.split('@')[0],
      avatar: user?.profile_picture,
      role: user?.role
    };
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleLikeTopic = async () => {
    try {
      const likedBy = topic.liked_by || [];
      const hasLiked = likedBy.includes(currentUser.email);
      
      const newLikedBy = hasLiked 
        ? likedBy.filter(e => e !== currentUser.email)
        : [...likedBy, currentUser.email];

      await ForumTopic.update(topic.id, {
        liked_by: newLikedBy,
        likes_count: newLikedBy.length
      });
      onUpdate?.();
    } catch (error) {
      toast({ title: "Erro ao curtir.", variant: "destructive" });
    }
  };

  const handleLikeReply = async (reply) => {
    try {
      const likedBy = reply.liked_by || [];
      const hasLiked = likedBy.includes(currentUser.email);
      
      const newLikedBy = hasLiked 
        ? likedBy.filter(e => e !== currentUser.email)
        : [...likedBy, currentUser.email];

      await ForumReply.update(reply.id, {
        liked_by: newLikedBy,
        likes_count: newLikedBy.length
      });
      loadReplies();
    } catch (error) {
      toast({ title: "Erro ao curtir.", variant: "destructive" });
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || topic.is_closed) return;

    setIsSubmitting(true);
    try {
      await ForumReply.create({
        topic_id: topic.id,
        content: replyContent.trim(),
        author_email: currentUser.email,
        author_name: currentUser.display_name || currentUser.full_name,
        is_best_answer: false,
        likes_count: 0,
        liked_by: []
      });

      await ForumTopic.update(topic.id, {
        replies_count: (topic.replies_count || 0) + 1,
        last_reply_at: new Date().toISOString(),
        last_reply_by: currentUser.email
      });

      setReplyContent("");
      loadReplies();
      onUpdate?.();
      toast({ title: "Resposta enviada!" });
    } catch (error) {
      toast({ title: "Erro ao enviar resposta.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleMarkBestAnswer = async (reply) => {
    try {
      // Remove best answer from others
      for (const r of replies) {
        if (r.is_best_answer && r.id !== reply.id) {
          await ForumReply.update(r.id, { is_best_answer: false });
        }
      }
      
      await ForumReply.update(reply.id, { is_best_answer: !reply.is_best_answer });
      await ForumTopic.update(topic.id, { is_resolved: !reply.is_best_answer });
      
      loadReplies();
      onUpdate?.();
      toast({ title: reply.is_best_answer ? "Marcação removida." : "Marcado como melhor resposta!" });
    } catch (error) {
      toast({ title: "Erro ao marcar resposta.", variant: "destructive" });
    }
  };

  const handleTogglePin = async () => {
    try {
      await ForumTopic.update(topic.id, { is_pinned: !topic.is_pinned });
      onUpdate?.();
      toast({ title: topic.is_pinned ? "Tópico desafixado." : "Tópico fixado!" });
    } catch (error) {
      toast({ title: "Erro.", variant: "destructive" });
    }
  };

  const handleToggleClose = async () => {
    try {
      await ForumTopic.update(topic.id, { is_closed: !topic.is_closed });
      onUpdate?.();
      toast({ title: topic.is_closed ? "Tópico reaberto." : "Tópico fechado!" });
    } catch (error) {
      toast({ title: "Erro.", variant: "destructive" });
    }
  };

  const handleDeleteReply = async (replyId) => {
    try {
      await ForumReply.delete(replyId);
      await ForumTopic.update(topic.id, {
        replies_count: Math.max(0, (topic.replies_count || 1) - 1)
      });
      loadReplies();
      onUpdate?.();
      toast({ title: "Resposta excluída." });
    } catch (error) {
      toast({ title: "Erro ao excluir.", variant: "destructive" });
    }
  };

  if (!topic) return null;

  const authorInfo = getUserInfo(topic.author_email);
  const isAuthor = currentUser?.email === topic.author_email;
  const hasLikedTopic = topic.liked_by?.includes(currentUser?.email);

  // Sort replies: best answer first
  const sortedReplies = [...replies].sort((a, b) => {
    if (a.is_best_answer) return -1;
    if (b.is_best_answer) return 1;
    return new Date(a.created_date) - new Date(b.created_date);
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <DialogTitle className="flex-1">{topic.title}</DialogTitle>
            
            {(isAdmin || isAuthor) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={handleTogglePin}>
                        <Pin className="w-4 h-4 mr-2" />
                        {topic.is_pinned ? "Desafixar" : "Fixar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleToggleClose}>
                        {topic.is_closed ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                        {topic.is_closed ? "Reabrir" : "Fechar"}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {topic.is_pinned && <Badge className="bg-amber-100 text-amber-700"><Pin className="w-3 h-3 mr-1" />Fixado</Badge>}
            {topic.is_resolved && <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Resolvido</Badge>}
            {topic.is_closed && <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" />Fechado</Badge>}
          </div>
        </DialogHeader>

        {/* Topic Content */}
        <Card className="border-2 border-blue-100">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={authorInfo.avatar} />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {getInitials(authorInfo.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">{authorInfo.name}</span>
                  {authorInfo.role === 'admin' && (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  )}
                  <span className="text-xs text-gray-500">
                    {format(new Date(topic.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {topic.content}
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLikeTopic}
                    className={hasLikedTopic ? "text-blue-600" : ""}
                  >
                    <ThumbsUp className={`w-4 h-4 mr-1 ${hasLikedTopic ? "fill-blue-600" : ""}`} />
                    {topic.likes_count || 0}
                  </Button>
                  <span className="text-sm text-gray-500">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    {replies.length} respostas
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Replies */}
        <div className="space-y-4">
          <h3 className="font-semibold">Respostas ({replies.length})</h3>
          
          {loading ? (
            <p className="text-center text-gray-500 py-4">Carregando...</p>
          ) : sortedReplies.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Nenhuma resposta ainda. Seja o primeiro!</p>
          ) : (
            sortedReplies.map(reply => {
              const replyAuthor = getUserInfo(reply.author_email);
              const isReplyAuthor = currentUser?.email === reply.author_email;
              const hasLikedReply = reply.liked_by?.includes(currentUser?.email);

              return (
                <Card 
                  key={reply.id} 
                  className={reply.is_best_answer ? "border-2 border-green-400 bg-green-50/50" : ""}
                >
                  <CardContent className="p-4">
                    {reply.is_best_answer && (
                      <div className="flex items-center gap-2 mb-3 text-green-700">
                        <Award className="w-5 h-5" />
                        <span className="font-semibold text-sm">Melhor Resposta</span>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={replyAuthor.avatar} />
                        <AvatarFallback className="bg-gray-100 text-gray-700 text-sm">
                          {getInitials(replyAuthor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">{replyAuthor.name}</span>
                          {replyAuthor.role === 'admin' && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(reply.created_date), { addSuffix: true, locale: ptBR })}
                          </span>
                          {reply.is_edited && <span className="text-xs text-gray-400">(editado)</span>}
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                          {reply.content}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleLikeReply(reply)}
                            className={hasLikedReply ? "text-blue-600" : ""}
                          >
                            <ThumbsUp className={`w-4 h-4 mr-1 ${hasLikedReply ? "fill-blue-600" : ""}`} />
                            {reply.likes_count || 0}
                          </Button>
                          
                          {(isAuthor || isAdmin) && !reply.is_best_answer && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleMarkBestAnswer(reply)}
                              className="text-green-600"
                            >
                              <Award className="w-4 h-4 mr-1" />
                              Marcar como melhor
                            </Button>
                          )}

                          {reply.is_best_answer && (isAuthor || isAdmin) && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleMarkBestAnswer(reply)}
                            >
                              Remover marcação
                            </Button>
                          )}

                          {(isReplyAuthor || isAdmin) && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteReply(reply.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Reply Input */}
        {!topic.is_closed ? (
          <div className="space-y-3 pt-4 border-t">
            <Textarea
              placeholder="Escreva sua resposta..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmitReply} 
                disabled={isSubmitting || !replyContent.trim()}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "Enviando..." : "Enviar Resposta"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
            <Lock className="w-5 h-5 mx-auto mb-2" />
            Este tópico está fechado para novas respostas.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}