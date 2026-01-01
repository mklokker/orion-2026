import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, MessageCircle, Lightbulb, Share2 } from "lucide-react";
import { ForumTopic } from "@/entities/ForumTopic";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = [
  { value: "duvida", label: "Dúvida", icon: HelpCircle, description: "Preciso de ajuda com algo" },
  { value: "discussao", label: "Discussão", icon: MessageCircle, description: "Quero debater um assunto" },
  { value: "sugestao", label: "Sugestão", icon: Lightbulb, description: "Tenho uma ideia para compartilhar" },
  { value: "compartilhamento", label: "Compartilhamento", icon: Share2, description: "Quero compartilhar algo útil" }
];

export default function CreateTopicModal({ open, onClose, courseId, currentUser, onCreated }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("duvida");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Preencha todos os campos.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await ForumTopic.create({
        title: title.trim(),
        content: content.trim(),
        course_id: courseId || null,
        author_email: currentUser.email,
        author_name: currentUser.display_name || currentUser.full_name || currentUser.email,
        category,
        is_pinned: false,
        is_closed: false,
        is_resolved: false,
        views_count: 0,
        replies_count: 0,
        likes_count: 0,
        liked_by: []
      });

      toast({ title: "Tópico criado com sucesso!" });
      setTitle("");
      setContent("");
      setCategory("duvida");
      onCreated?.();
      onClose();
    } catch (error) {
      console.error("Erro ao criar tópico:", error);
      toast({ title: "Erro ao criar tópico.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Tópico</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <cat.icon className="w-4 h-4" />
                      <span>{cat.label}</span>
                      <span className="text-xs text-gray-500">- {cat.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              placeholder="Escreva um título claro e objetivo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 text-right">{title.length}/200</p>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              placeholder="Descreva sua dúvida ou assunto em detalhes..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar Tópico"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}