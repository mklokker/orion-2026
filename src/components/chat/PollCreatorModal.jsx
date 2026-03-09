import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, X, BarChart2 } from "lucide-react";

export default function PollCreatorModal({ open, onClose, onSubmit }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multipleChoice, setMultipleChoice] = useState(false);

  const handleAddOption = () => {
    if (options.length < 6) setOptions(prev => [...prev, ""]);
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleOptionChange = (idx, value) => {
    setOptions(prev => {
      const updated = [...prev];
      updated[idx] = value;
      return updated;
    });
  };

  const handleSubmit = () => {
    const filledOptions = options.filter(o => o.trim());
    if (!question.trim() || filledOptions.length < 2) return;

    onSubmit({
      question: question.trim(),
      options: filledOptions.map((text, i) => ({ id: String(i + 1), text: text.trim() })),
      votes: {},
      closed: false,
      multiple_choice: multipleChoice,
    });

    setQuestion("");
    setOptions(["", ""]);
    setMultipleChoice(false);
    onClose();
  };

  const handleClose = () => {
    setQuestion("");
    setOptions(["", ""]);
    setMultipleChoice(false);
    onClose();
  };

  const isValid = question.trim() && options.filter(o => o.trim()).length >= 2;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Criar Enquete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Pergunta</Label>
            <Input
              placeholder="Digite a pergunta da enquete..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Opções</Label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Opção ${idx + 1}`}
                    value={opt}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    className="flex-1"
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => handleRemoveOption(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={handleAddOption}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar opção
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="text-sm font-medium cursor-pointer" htmlFor="multiple-choice-switch">
              Permitir múltiplas escolhas
            </Label>
            <Switch
              id="multiple-choice-switch"
              checked={multipleChoice}
              onCheckedChange={setMultipleChoice}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="w-full sm:w-auto">
            Criar Enquete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}