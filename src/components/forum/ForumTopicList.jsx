import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Eye, 
  ThumbsUp, 
  Pin, 
  CheckCircle2,
  Lock,
  HelpCircle,
  Lightbulb,
  Share2,
  MessageCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORY_CONFIG = {
  duvida: { label: "Dúvida", icon: HelpCircle, color: "bg-blue-100 text-blue-700" },
  discussao: { label: "Discussão", icon: MessageCircle, color: "bg-purple-100 text-purple-700" },
  sugestao: { label: "Sugestão", icon: Lightbulb, color: "bg-amber-100 text-amber-700" },
  compartilhamento: { label: "Compartilhamento", icon: Share2, color: "bg-green-100 text-green-700" }
};

export default function ForumTopicList({ topics, users, onSelectTopic }) {
  const getUserInfo = (email) => {
    const user = users.find(u => u.email === email);
    return {
      name: user?.display_name || user?.full_name || email.split('@')[0],
      avatar: user?.profile_picture
    };
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (topics.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum tópico encontrado.</p>
          <p className="text-sm text-gray-400 mt-1">Seja o primeiro a criar um tópico!</p>
        </CardContent>
      </Card>
    );
  }

  // Sort: pinned first, then by last activity
  const sortedTopics = [...topics].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    const dateA = new Date(a.last_reply_at || a.created_date);
    const dateB = new Date(b.last_reply_at || b.created_date);
    return dateB - dateA;
  });

  return (
    <div className="space-y-3">
      {sortedTopics.map(topic => {
        const authorInfo = getUserInfo(topic.author_email);
        const category = CATEGORY_CONFIG[topic.category] || CATEGORY_CONFIG.duvida;
        const CategoryIcon = category.icon;

        return (
          <Card 
            key={topic.id} 
            className={`hover:shadow-md transition-all cursor-pointer border-l-4 ${
              topic.is_pinned ? 'border-l-amber-500 bg-amber-50/30' :
              topic.is_resolved ? 'border-l-green-500' : 'border-l-blue-500'
            }`}
            onClick={() => onSelectTopic(topic)}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Avatar className="w-10 h-10 hidden sm:flex">
                  <AvatarImage src={authorInfo.avatar} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                    {getInitials(authorInfo.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    {topic.is_pinned && (
                      <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                    <h3 className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1">
                      {topic.title}
                    </h3>
                    {topic.is_resolved && (
                      <Badge className="bg-green-100 text-green-700 gap-1 flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Resolvido
                      </Badge>
                    )}
                    {topic.is_closed && (
                      <Badge variant="secondary" className="gap-1 flex-shrink-0">
                        <Lock className="w-3 h-3" />
                        Fechado
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                    {topic.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                  </p>

                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <Badge variant="outline" className={`gap-1 ${category.color}`}>
                      <CategoryIcon className="w-3 h-3" />
                      {category.label}
                    </Badge>

                    <span className="text-xs text-gray-500">
                      por <span className="font-medium">{authorInfo.name}</span>
                    </span>

                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(topic.created_date), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-sm text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title="Respostas">
                      <MessageSquare className="w-4 h-4" />
                      {topic.replies_count || 0}
                    </span>
                    <span className="flex items-center gap-1" title="Visualizações">
                      <Eye className="w-4 h-4" />
                      {topic.views_count || 0}
                    </span>
                    <span className="flex items-center gap-1" title="Curtidas">
                      <ThumbsUp className="w-4 h-4" />
                      {topic.likes_count || 0}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}