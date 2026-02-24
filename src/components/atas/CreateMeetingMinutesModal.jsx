import React, { useState, useEffect } from "react";
import { MeetingMinutes } from "@/entities/MeetingMinutes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { X, Plus, Users } from "lucide-react";

export default function CreateMeetingMinutesModal({ open, onClose, meeting, categories, users, onSave }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState("");
  const [responsible, setResponsible] = useState("");
  const [category, setCategory] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [participants, setParticipants] = useState([]);
  const [mainTopics, setMainTopics] = useState("");
  const [decisions, setDecisions] = useState("");
  const [controls, setControls] = useState({
    on_time: false,
    started_on_time: false,
    had_agenda: false,
    agenda_fulfilled: false,
    all_participants_present: false
  });
  const [newParticipant, setNewParticipant] = useState("");

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title || "");
      setResponsible(meeting.responsible || "");
      setCategory(meeting.category || "");
      setMeetingDate(meeting.meeting_date || "");
      setMeetingTime(meeting.meeting_time || "");
      setLocation(meeting.location || "");
      setAgenda(meeting.agenda || "");
      setParticipants(meeting.participants || []);
      setMainTopics(meeting.main_topics || "");
      setDecisions(meeting.decisions || "");
      setControls(meeting.controls || {
        on_time: false,
        started_on_time: false,
        had_agenda: false,
        agenda_fulfilled: false,
        all_participants_present: false
      });
    } else {
      resetForm();
    }
  }, [meeting, open]);

  const resetForm = () => {
    setTitle("");
    setResponsible("");
    setCategory("");
    setMeetingDate("");
    setMeetingTime("");
    setLocation("");
    setAgenda("");
    setParticipants([]);
    setMainTopics("");
    setDecisions("");
    setControls({
      on_time: false,
      started_on_time: false,
      had_agenda: false,
      agenda_fulfilled: false,
      all_participants_present: false
    });
    setNewParticipant("");
  };

  const handleAddParticipant = () => {
    if (newParticipant.trim() && !participants.includes(newParticipant.trim())) {
      setParticipants([...participants, newParticipant.trim()]);
      setNewParticipant("");
    }
  };

  const handleRemoveParticipant = (p) => {
    setParticipants(participants.filter(x => x !== p));
  };

  const handleSelectUser = (email) => {
    const user = users.find(u => u.email === email);
    if (user) {
      const name = user.display_name || user.full_name || user.email;
      if (!participants.includes(name)) {
        setParticipants([...participants, name]);
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !responsible.trim() || !meetingDate) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        responsible: responsible.trim(),
        category: category || null,
        meeting_date: meetingDate,
        meeting_time: meetingTime || null,
        location: location.trim() || null,
        agenda: agenda.trim() || null,
        participants,
        main_topics: mainTopics.trim() || null,
        decisions: decisions.trim() || null,
        controls
      };

      if (meeting) {
        await MeetingMinutes.update(meeting.id, data);
        toast({ title: "Ata atualizada com sucesso!" });
      } else {
        await MeetingMinutes.create(data);
        toast({ title: "Ata criada com sucesso!" });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar ata:", error);
      toast({ title: "Erro ao salvar ata", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{meeting ? "Editar Ata de Reunião" : "Nova Ata de Reunião"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Memória de Reunião (Título) *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Procedimento de reconhecimento de firma" />
              </div>

              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nome do responsável" />
              </div>

              <div className="space-y-2">
                <Label>Categoria/Fundamento</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Local</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Cartório, Sala de Reuniões..." />
              </div>
            </div>

            {/* Pauta */}
            <div className="space-y-2">
              <Label>Pauta</Label>
              <Textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="Descreva a pauta da reunião..." rows={3} />
            </div>

            {/* Participantes */}
            <div className="space-y-2">
              <Label>Participantes</Label>
              <div className="flex gap-2">
                <Select onValueChange={handleSelectUser}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar usuário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.email}>
                        {user.display_name || user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-2">
                <Input 
                  value={newParticipant} 
                  onChange={(e) => setNewParticipant(e.target.value)}
                  placeholder="Ou digite o nome manualmente..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())}
                />
                <Button type="button" variant="outline" onClick={handleAddParticipant}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {participants.map((p, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {p}
                      <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => handleRemoveParticipant(p)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Principais Tópicos */}
            <div className="space-y-2">
              <Label>Principais Tópicos</Label>
              <Textarea value={mainTopics} onChange={(e) => setMainTopics(e.target.value)} placeholder="Descreva os principais tópicos discutidos..." rows={3} />
            </div>

            {/* Decisões */}
            <div className="space-y-2">
              <Label>Decisões</Label>
              <Textarea value={decisions} onChange={(e) => setDecisions(e.target.value)} placeholder="Descreva as decisões tomadas..." rows={5} />
            </div>

            {/* Controles */}
            <div className="space-y-3">
              <Label>Controles da Reunião</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="on_time" checked={controls.on_time} onCheckedChange={(checked) => setControls({...controls, on_time: checked})} />
                  <label htmlFor="on_time" className="text-sm">Cumpriu Horário</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="started_on_time" checked={controls.started_on_time} onCheckedChange={(checked) => setControls({...controls, started_on_time: checked})} />
                  <label htmlFor="started_on_time" className="text-sm">Começou no Horário Certo</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="had_agenda" checked={controls.had_agenda} onCheckedChange={(checked) => setControls({...controls, had_agenda: checked})} />
                  <label htmlFor="had_agenda" className="text-sm">Tinha Pauta de Reunião</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="agenda_fulfilled" checked={controls.agenda_fulfilled} onCheckedChange={(checked) => setControls({...controls, agenda_fulfilled: checked})} />
                  <label htmlFor="agenda_fulfilled" className="text-sm">Cumprimento da Pauta</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="all_participants" checked={controls.all_participants_present} onCheckedChange={(checked) => setControls({...controls, all_participants_present: checked})} />
                  <label htmlFor="all_participants" className="text-sm">Estavam todos os participantes</label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : (meeting ? "Salvar" : "Criar Ata")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}