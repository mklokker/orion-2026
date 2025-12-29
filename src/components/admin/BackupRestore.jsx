import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  Download, 
  Upload, 
  Database, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  FileJson,
  HardDrive
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Import all entities
import { Department } from "@/entities/Department";
import { Task } from "@/entities/Task";
import { Service } from "@/entities/Service";
import { TaskInteraction } from "@/entities/TaskInteraction";
import { ServiceInteraction } from "@/entities/ServiceInteraction";
import { UserStar } from "@/entities/UserStar";
import { Notification } from "@/entities/Notification";
import { UserColumnOrder } from "@/entities/UserColumnOrder";
import { ChatConversation } from "@/entities/ChatConversation";
import { ChatMessage } from "@/entities/ChatMessage";
import { ChatTyping } from "@/entities/ChatTyping";
import { Desk } from "@/entities/Desk";
import { Sector } from "@/entities/Sector";
import { AppSettings } from "@/entities/AppSettings";
import { DocumentCategory } from "@/entities/DocumentCategory";
import { Document } from "@/entities/Document";
import { DocumentVersion } from "@/entities/DocumentVersion";
import { DocumentFavorite } from "@/entities/DocumentFavorite";
import { Course } from "@/entities/Course";
import { CourseVideo } from "@/entities/CourseVideo";

const ENTITIES_CONFIG = [
  { name: "Department", entity: Department, label: "Departamentos" },
  { name: "Task", entity: Task, label: "Tarefas" },
  { name: "Service", entity: Service, label: "Serviços" },
  { name: "TaskInteraction", entity: TaskInteraction, label: "Interações de Tarefas" },
  { name: "ServiceInteraction", entity: ServiceInteraction, label: "Interações de Serviços" },
  { name: "UserStar", entity: UserStar, label: "Estrelas (Ranking)" },
  { name: "Notification", entity: Notification, label: "Notificações" },
  { name: "UserColumnOrder", entity: UserColumnOrder, label: "Ordem de Colunas" },
  { name: "ChatConversation", entity: ChatConversation, label: "Conversas de Chat" },
  { name: "ChatMessage", entity: ChatMessage, label: "Mensagens de Chat" },
  { name: "ChatTyping", entity: ChatTyping, label: "Status de Digitação" },
  { name: "Desk", entity: Desk, label: "Mesas" },
  { name: "Sector", entity: Sector, label: "Setores" },
  { name: "AppSettings", entity: AppSettings, label: "Configurações do App" },
  { name: "DocumentCategory", entity: DocumentCategory, label: "Categorias de Documentos" },
  { name: "Document", entity: Document, label: "Documentos" },
  { name: "DocumentVersion", entity: DocumentVersion, label: "Versões de Documentos" },
  { name: "DocumentFavorite", entity: DocumentFavorite, label: "Favoritos de Documentos" },
  { name: "Course", entity: Course, label: "Cursos" },
  { name: "CourseVideo", entity: CourseVideo, label: "Vídeos de Cursos" },
];

export default function BackupRestore() {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentEntity, setCurrentEntity] = useState("");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState(null);
  const [backupStats, setBackupStats] = useState(null);

  const handleBackup = async () => {
    setIsBackingUp(true);
    setProgress(0);
    setBackupStats(null);

    const backupData = {
      version: "1.0",
      created_at: new Date().toISOString(),
      entities: {}
    };

    const stats = {};

    try {
      for (let i = 0; i < ENTITIES_CONFIG.length; i++) {
        const { name, entity, label } = ENTITIES_CONFIG[i];
        setCurrentEntity(label);
        setProgress(Math.round(((i + 1) / ENTITIES_CONFIG.length) * 100));

        try {
          const data = await entity.list();
          backupData.entities[name] = data;
          stats[label] = data.length;
        } catch (error) {
          console.error(`Erro ao fazer backup de ${name}:`, error);
          backupData.entities[name] = [];
          stats[label] = 0;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Create and download the file
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toISOString().split('T')[0];
      const filename = `backup_orion_${date}.json`;
      
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStats(stats);
      
      toast({
        title: "Backup concluído!",
        description: `Arquivo ${filename} baixado com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      toast({
        title: "Erro no backup",
        description: "Ocorreu um erro ao criar o backup.",
        variant: "destructive"
      });
    } finally {
      setIsBackingUp(false);
      setCurrentEntity("");
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo JSON de backup.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (!data.version || !data.entities) {
          toast({
            title: "Arquivo inválido",
            description: "Este arquivo não parece ser um backup válido do sistema.",
            variant: "destructive"
          });
          return;
        }

        setPendingRestoreFile(data);
        setShowRestoreConfirm(true);
      } catch (error) {
        toast({
          title: "Erro ao ler arquivo",
          description: "O arquivo selecionado não é um JSON válido.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleRestore = async () => {
    if (!pendingRestoreFile) return;

    setShowRestoreConfirm(false);
    setIsRestoring(true);
    setProgress(0);

    const stats = { restored: 0, errors: 0 };

    try {
      const entitiesToRestore = ENTITIES_CONFIG.filter(
        config => pendingRestoreFile.entities[config.name]?.length > 0
      );

      for (let i = 0; i < entitiesToRestore.length; i++) {
        const { name, entity, label } = entitiesToRestore[i];
        const records = pendingRestoreFile.entities[name];
        
        setCurrentEntity(`${label} (${records.length} registros)`);
        setProgress(Math.round(((i + 1) / entitiesToRestore.length) * 100));

        for (const record of records) {
          try {
            // Remove system fields that shouldn't be restored
            const { id, created_date, updated_date, created_by, created_by_id, entity_name, app_id, is_sample, is_deleted, deleted_date, ...cleanRecord } = record;
            
            // Check if record already exists by a unique field (varies by entity)
            let existingRecord = null;
            
            try {
              if (name === "Department" && cleanRecord.name) {
                const existing = await entity.filter({ name: cleanRecord.name });
                existingRecord = existing[0];
              } else if (name === "Task" && cleanRecord.protocol) {
                const existing = await entity.filter({ protocol: cleanRecord.protocol });
                existingRecord = existing[0];
              } else if (name === "AppSettings") {
                const existing = await entity.list();
                existingRecord = existing[0];
              }
            } catch (filterError) {
              // Ignore filter errors
            }

            if (existingRecord) {
              // Update existing record
              await entity.update(existingRecord.id, cleanRecord);
            } else {
              // Create new record
              await entity.create(cleanRecord);
            }
            
            stats.restored++;
          } catch (recordError) {
            console.error(`Erro ao restaurar registro de ${name}:`, recordError);
            stats.errors++;
          }
        }

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      toast({
        title: "Restauração concluída!",
        description: `${stats.restored} registros restaurados. ${stats.errors > 0 ? `${stats.errors} erros.` : ''}`,
      });
    } catch (error) {
      console.error("Erro na restauração:", error);
      toast({
        title: "Erro na restauração",
        description: "Ocorreu um erro durante a restauração.",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
      setCurrentEntity("");
      setPendingRestoreFile(null);
    }
  };

  const getTotalRecords = (data) => {
    if (!data?.entities) return 0;
    return Object.values(data.entities).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  };

  return (
    <>
      <Card className="shadow-lg border-0">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Backup e Restauração
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backup Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-green-50/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <Download className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Criar Backup</h3>
                  <p className="text-sm text-gray-600">
                    Exportar todos os dados do sistema
                  </p>
                </div>
              </div>

              {isBackingUp && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Exportando: {currentEntity}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {backupStats && !isBackingUp && (
                <div className="bg-white p-3 rounded-lg border space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Backup realizado com sucesso!
                  </p>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {Object.entries(backupStats).map(([label, count]) => (
                      <div key={label} className="flex justify-between">
                        <span>{label}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleBackup}
                disabled={isBackingUp || isRestoring}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando backup...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Fazer Backup Agora
                  </>
                )}
              </Button>
            </div>

            {/* Restore Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-orange-50/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Upload className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Restaurar Backup</h3>
                  <p className="text-sm text-gray-600">
                    Importar dados de um arquivo de backup
                  </p>
                </div>
              </div>

              {isRestoring && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Restaurando: {currentEntity}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="bg-white p-3 rounded-lg border">
                <div className="flex items-start gap-2 text-sm text-orange-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    A restauração pode sobrescrever dados existentes. 
                    Recomendamos fazer um backup antes de restaurar.
                  </p>
                </div>
              </div>

              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  disabled={isBackingUp || isRestoring}
                  className="hidden"
                />
                <Button
                  asChild
                  disabled={isBackingUp || isRestoring}
                  variant="outline"
                  className="w-full gap-2 border-orange-300 text-orange-700 hover:bg-orange-100 cursor-pointer"
                >
                  <span>
                    {isRestoring ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Restaurando...
                      </>
                    ) : (
                      <>
                        <FileJson className="w-4 h-4" />
                        Selecionar Arquivo de Backup
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <HardDrive className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Dados incluídos no backup:</p>
                <p className="text-blue-700">
                  Departamentos, Tarefas, Serviços, Interações, Ranking (Estrelas), 
                  Notificações, Conversas e Mensagens de Chat, Mesas, Setores, 
                  Configurações do App, Documentos, Categorias, Versões, Cursos e Vídeos.
                </p>
                <p className="mt-2 text-blue-600 font-medium">
                  Nota: Dados de usuários não são incluídos no backup por segurança.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirmar Restauração
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a restaurar um backup do sistema. Esta ação pode sobrescrever dados existentes.
                </p>
                
                {pendingRestoreFile && (
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    <p className="font-medium text-gray-900 mb-1">Detalhes do backup:</p>
                    <p className="text-gray-600">
                      Data: {new Date(pendingRestoreFile.created_at).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-gray-600">
                      Total de registros: {getTotalRecords(pendingRestoreFile)}
                    </p>
                  </div>
                )}

                <p className="font-medium text-orange-600">
                  Recomendamos fazer um backup dos dados atuais antes de continuar.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Restaurar Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}