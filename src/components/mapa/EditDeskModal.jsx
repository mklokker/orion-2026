import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EditDeskModal({ open, onClose, desk, users, departments, sectors, onUpdate }) {
  const [deskData, setDeskData] = useState({
    name: "",
    desk_type: "single",
    desk_size: "medium_square",
    capacity: 1,
    positions: [],
    department_id: "",
    sector_id: "",
    color: "#3B82F6",
    rotation: 0
  });

  useEffect(() => {
    if (desk) {
      setDeskData({
        name: desk.name || "",
        desk_type: desk.desk_type || "single",
        desk_size: desk.desk_size || "medium_square",
        capacity: desk.capacity || 1,
        positions: desk.positions || [],
        department_id: desk.department_id || "",
        sector_id: desk.sector_id || "",
        color: desk.color || "#3B82F6",
        rotation: desk.rotation || 0
      });
    }
  }, [desk]);

  const handleUserChange = (positionIndex, userEmail) => {
    setDeskData(prev => ({
      ...prev,
      positions: prev.positions.map(p => 
        p.position_index === positionIndex ? { ...p, user_email: userEmail } : p
      )
    }));
  };

  const handleSubmit = () => {
    if (!deskData.name.trim()) {
      alert("Por favor, dê um nome à mesa");
      return;
    }
    
    onUpdate(desk.id, deskData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Mesa de Trabalho</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da Mesa</Label>
            <Input
              placeholder="Ex: Mesa 1, Recepção, Financeiro..."
              value={deskData.name}
              onChange={(e) => setDeskData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Mesa</Label>
              <Select 
                value={deskData.desk_type} 
                onValueChange={(value) => setDeskData(prev => ({ ...prev, desk_type: value }))}
                disabled
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Individual (1 pessoa)</SelectItem>
                  <SelectItem value="double">Dupla (2 pessoas lado a lado)</SelectItem>
                  <SelectItem value="facing_4">Frente a Frente (2x2 - 4 pessoas)</SelectItem>
                  <SelectItem value="facing_6">Frente a Frente (3x3 - 6 pessoas)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Tipo não pode ser alterado após criação</p>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select 
                value={deskData.department_id} 
                onValueChange={(value) => setDeskData(prev => ({ ...prev, department_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Setor (Localização Física)</Label>
            <Select 
              value={deskData.sector_id} 
              onValueChange={(value) => setDeskData(prev => ({ ...prev, sector_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhum</SelectItem>
                {sectors && sectors.map(sector => (
                  <SelectItem key={sector.id} value={sector.id}>{sector.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tamanho e Forma</Label>
              <Select 
                value={deskData.desk_size} 
                onValueChange={(value) => setDeskData(prev => ({ ...prev, desk_size: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small_square">Quadrado Pequeno</SelectItem>
                  <SelectItem value="medium_square">Quadrado Médio</SelectItem>
                  <SelectItem value="large_square">Quadrado Grande</SelectItem>
                  <SelectItem value="small_rectangle">Retângulo Pequeno</SelectItem>
                  <SelectItem value="medium_rectangle">Retângulo Médio</SelectItem>
                  <SelectItem value="large_rectangle">Retângulo Grande</SelectItem>
                  <SelectItem value="small_round">Redondo Pequeno</SelectItem>
                  <SelectItem value="medium_round">Redondo Médio</SelectItem>
                  <SelectItem value="large_round">Redondo Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor da Mesa</Label>
                <div className="flex gap-2 flex-wrap">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                      style={{ 
                        backgroundColor: color,
                        borderColor: deskData.color === color ? '#1F2937' : 'transparent'
                      }}
                      onClick={() => setDeskData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rotação ({deskData.rotation}°)</Label>
                <Input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={deskData.rotation}
                  onChange={(e) => setDeskData(prev => ({ ...prev, rotation: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Funcionários ({deskData.capacity} posições)</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {deskData.positions.map((pos, idx) => {
                const selectedEmails = deskData.positions
                  .map(p => p.user_email)
                  .filter(email => email && email !== pos.user_email);
                
                const availableUsers = users.filter(user => 
                  !selectedEmails.includes(user.email)
                );
                
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 w-20">Posição {idx + 1}:</span>
                    <Select 
                      value={pos.user_email || ""} 
                      onValueChange={(value) => handleUserChange(idx, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Vazio</SelectItem>
                        {availableUsers.map(user => (
                          <SelectItem key={user.id} value={user.email}>
                            {user.display_name || user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}