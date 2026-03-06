import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@/entities/User";
import { UploadFile } from "@/integrations/Core";
import { Camera, Save, X, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ImageCropModal from "./ImageCropModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"; // Added import

export default function UserProfileModal({ open, onClose, user, onUpdate }) {
  const { toast } = useToast();
  const [editedUser, setEditedUser] = useState({
    display_name: user?.display_name || user?.full_name || "",
    profile_picture: user?.profile_picture || "",
    department_id: user?.department_id || "" // Added department_id to initial state
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []); // Load departments once on component mount

  useEffect(() => {
    if (user) {
      setEditedUser({
        display_name: user.display_name || user.full_name || "",
        profile_picture: user.profile_picture || "",
        department_id: user.department_id || "" // Updated department_id on user change
      });
    }
  }, [user]);

  const loadDepartments = async () => {
    try {
      const { Department } = await import("@/entities/Department"); // Dynamic import
      const depts = await Department.list();
      setDepartments(depts);
    } catch (error) {
      console.error("Erro ao carregar departamentos:", error);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A foto deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const { file_url } = await UploadFile({ file });
      setEditedUser({ ...editedUser, profile_picture: file_url });
      toast({
        title: "Foto carregada!",
        description: "Não esqueça de salvar as alterações.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da foto.",
        variant: "destructive"
      });
    }
    setIsUploadingPhoto(false);
  };

  const handleSave = async () => {
    if (!editedUser.display_name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha seu nome completo.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await User.updateMyUserData({
        display_name: editedUser.display_name.trim(),
        profile_picture: editedUser.profile_picture,
        department_id: editedUser.department_id || null // Added department_id to update payload
      });

      toast({
        title: "Sucesso!",
        description: "Perfil atualizado com sucesso.",
      });
      
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil.",
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = user?.display_name || user?.full_name || "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Meu Perfil</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-border">
                <AvatarImage src={editedUser.profile_picture} alt={displayName} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
              >
                <Camera className="w-5 h-5" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
              </label>
            </div>
            {isUploadingPhoto && (
              <p className="text-sm text-muted-foreground">Carregando foto...</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Nome Completo *</Label>
            <Input
              id="display_name"
              value={editedUser.display_name}
              onChange={(e) => setEditedUser({ ...editedUser, display_name: e.target.value })}
              placeholder="Digite seu nome completo"
            />
          </div>

          <div className="space-y-2"> {/* Added Department Select */}
            <Label htmlFor="department">Departamento</Label>
            <Select 
              value={editedUser.department_id} 
              onValueChange={(value) => setEditedUser({ ...editedUser, department_id: value })}
            >
              <SelectTrigger id="department">
                <SelectValue placeholder="Selecione seu departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhum departamento</SelectItem> {/* Use empty string for "None" option */}
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Input
              id="role"
              value={user?.role === 'admin' ? 'Administrador' : 'Usuário'}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="bg-accent border border-border rounded-lg p-4">
            <p className="text-sm text-accent-foreground">
              <strong>Alteração de senha:</strong> Para alterar sua senha, entre em contato com o administrador do sistema.
            </p>
          </div>

          {/* Account Deletion Section */}
          <div className="border-t pt-4 mt-4">
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Minha Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600">Excluir Conta</AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="block mb-2">
                      Tem certeza que deseja excluir sua conta? Esta ação é <strong>irreversível</strong>.
                    </span>
                    <span className="block text-red-600 font-medium">
                      Todos os seus dados serão permanentemente removidos.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setIsDeleting(true);
                      // Simulate async API call for account deletion
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      toast({
                        title: "Solicitação enviada",
                        description: "Entre em contato com o administrador para concluir a exclusão da conta.",
                      });
                      setIsDeleting(false);
                      setShowDeleteConfirm(false);
                      onClose();
                    }}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Processando..." : "Sim, excluir minha conta"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Ao excluir sua conta, você perderá acesso a todos os dados.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isUploadingPhoto}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}