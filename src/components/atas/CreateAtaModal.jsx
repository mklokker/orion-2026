import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function CreateAtaModal({
  open,
  onClose,
  onSave,
  ata,
  categorias,
  users,
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    responsible: "",
    category: "",
    meeting_date: "",
    meeting_time: "",
    location: "",
    agenda: "",
    participants: [],
    main_topics: "",
    decisions: "",
    controls: {
      on_time: false,
      started_on_time: false,
      had_agenda: false,
      agenda_fulfilled: false,
      all_participants_present: false,
    },
  });

  useEffect(() => {
    if (ata) {
      setForm({
        title: ata.title || "",
        responsible: ata.responsible || "",
        category: ata.category || "",
        meeting_date: ata.meeting_date || "",
        meeting_time: ata.meeting_time || "",
        location: ata.location || "",
        agenda: ata.agenda || "",
        participants: ata.participants || [],
        main_topics: ata.main_topics || "",
        decisions: ata.decisions || "",
        controls: ata.controls || {
          on_time: false,
          started_on_time: false,
          had_agenda: false,
          agenda_fulfilled: false,
          all_participants_present: false,
        },
      });
    } else {
      setForm({
        title: "",
        responsible: "",
        category: "",
        meeting_date: "",
        meeting_time: "",
        location: "",
        agenda: "",
        participants: [],
        main_topics: "",
        decisions: "",
        controls: {
          on_time: false,
          started_on_time: false,
          had_agenda: false,
          agenda_fulfilled: false,
          all_participants_present: false,
        },
      });
    }
  }, [ata, open]);

  const addParticipant = (name) => {
    if (name && !form.participants.includes(name)) {
      setForm({ ...form, participants: [...form.participants, name] });
    }
  };

  const removeParticipant = (name) => {
    setForm({
      ...form,
      participants: form.participants.filter((p) => p !== name),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.responsible || !form.meeting_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (ata) {
        await base44.entities.AtaReuniao.update(ata.id, form);
        toast({ title: "Sucesso", description: "Ata atualizada!" });
      } else {
        await base44.entities.AtaReuniao.create(form);
        toast({ title: "Sucesso", description: "Ata criada!" });
      }
      onSave();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a ata.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ata ? "Editar Ata" : "Nova Ata de Reunião"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título da ata"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsável *</Label>
              <Select
                value={form.responsible}
                onValueChange={(v) => setForm({ ...form, responsible: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.full_name || user.email}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.meeting_date}
                onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Horário</Label>
              <Input
                type="time"
                value={form.meeting_time}
                onChange={(e) => setForm({ ...form, meeting_time: e.target.value })}
              />
            </div>
            <div>
              <Label>Local</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Local da reunião"
              />
            </div>
          </div>

          <div>
            <Label>Participantes</Label>
            <Select onValueChange={addParticipant}>
              <SelectTrigger>
                <SelectValue placeholder="Adicionar participante" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => !form.participants.includes(u.full_name || u.email))
                  .map((user) => (
                    <SelectItem key={user.id} value={user.full_name || user.email}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {form.participants.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.participants.map((p) => (
                  <Badge key={p} variant="secondary" className="flex items-center gap-1">
                    {p}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeParticipant(p)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Pauta</Label>
            <Textarea
              value={form.agenda}
              onChange={(e) => setForm({ ...form, agenda: e.target.value })}
              placeholder="Pauta da reunião"
              rows={2}
            />
          </div>

          <div>
            <Label>Principais Tópicos Discutidos</Label>
            <Textarea
              value={form.main_topics}
              onChange={(e) => setForm({ ...form, main_topics: e.target.value })}
              placeholder="Tópicos discutidos"
              rows={3}
            />
          </div>

          <div>
            <Label>Decisões Tomadas</Label>
            <Textarea
              value={form.decisions}
              onChange={(e) => setForm({ ...form, decisions: e.target.value })}
              placeholder="Decisões tomadas"
              rows={3}
            />
          </div>

          <div>
            <Label className="mb-2 block">Controles</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "on_time", label: "Reunião no horário" },
                { key: "started_on_time", label: "Iniciou no horário" },
                { key: "had_agenda", label: "Tinha pauta definida" },
                { key: "agenda_fulfilled", label: "Pauta foi cumprida" },
                { key: "all_participants_present", label: "Todos presentes" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={form.controls[key]}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        controls: { ...form.controls, [key]: checked },
                      })
                    }
                  />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}