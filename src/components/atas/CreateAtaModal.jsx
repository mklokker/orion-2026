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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Search, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";

const normalizeText = (text) => {
  return (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};
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
  const [userSearch, setUserSearch] = useState("");
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantPopoverOpen, setParticipantPopoverOpen] = useState(false);
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
              <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {form.responsible || "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <div className="p-2 border-b">
                    <div className="flex items-center gap-2 px-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar usuário..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="border-0 p-0 h-8 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {users
                      .filter((u) => {
                        const displayName = u.display_name || u.full_name || u.email || "";
                        const search = userSearch || "";
                        return normalizeText(displayName).includes(normalizeText(search));
                      })
                      .map((user) => {
                        const displayName = user.display_name || user.full_name || user.email;
                        return (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setForm({ ...form, responsible: displayName });
                              setUserPopoverOpen(false);
                              setUserSearch("");
                            }}
                          >
                            {form.responsible === displayName && (
                              <Check className="w-4 h-4 text-green-500" />
                            )}
                            <span>{displayName}</span>
                          </div>
                        );
                      })}
                  </div>
                </PopoverContent>
              </Popover>
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
            <Popover open={participantPopoverOpen} onOpenChange={setParticipantPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  Adicionar participante
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0">
                <div className="p-2 border-b">
                  <div className="flex items-center gap-2 px-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      className="border-0 p-0 h-8 focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {users
                    .filter((u) => {
                      const displayName = u.display_name || u.full_name || u.email || "";
                      return !form.participants.includes(displayName);
                    })
                    .filter((u) => {
                      const displayName = u.display_name || u.full_name || u.email || "";
                      const search = participantSearch || "";
                      return normalizeText(displayName).includes(normalizeText(search));
                    })
                    .map((user) => {
                      const displayName = user.display_name || user.full_name || user.email;
                      return (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            addParticipant(displayName);
                            setParticipantSearch("");
                          }}
                        >
                          <span>{displayName}</span>
                        </div>
                      );
                    })}
                </div>
              </PopoverContent>
            </Popover>
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
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "on_time", label: "Reunião no horário" },
                { key: "started_on_time", label: "Iniciou no horário" },
                { key: "had_agenda", label: "Tinha pauta definida" },
                { key: "agenda_fulfilled", label: "Pauta foi cumprida" },
                { key: "all_participants_present", label: "Todos presentes" },
              ].map(({ key, label }) => (
                <div key={key} className={`flex items-center justify-between p-2 rounded-lg border ${form.controls[key] ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                  <Label htmlFor={`control-${key}`} className="text-sm cursor-pointer">{label}</Label>
                  <Switch
                    id={`control-${key}`}
                    checked={form.controls[key] === true}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        controls: { ...form.controls, [key]: checked === true },
                      })
                    }
                    className="data-[state=checked]:bg-green-500"
                  />
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