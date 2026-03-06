import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Image as ImageIcon, 
  File, 
  Download, 
  Search,
  X,
  FileSpreadsheet,
  FileIcon,
  Presentation,
  Music,
  Video,
  Archive,
  CheckSquare,
  Square
} from "lucide-react";
import { ChatMessage } from "@/entities/ChatMessage";
import { getLocalDayKey, getDateLabelBR, formatChatTime } from "@/components/utils/dateUtils";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILE_SIZE_LABEL = "25MB";

const FILE_CATEGORIES = {
  all: { label: "Todos", icon: File },
  images: { label: "Imagens", icon: ImageIcon, types: ["image/"] },
  documents: { label: "Documentos", icon: FileText, types: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml"] },
  spreadsheets: { label: "Planilhas", icon: FileSpreadsheet, types: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml"] },
  presentations: { label: "Apresentações", icon: Presentation, types: ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml"] },
  audio: { label: "Áudio", icon: Music, types: ["audio/"] },
  video: { label: "Vídeo", icon: Video, types: ["video/"] },
  other: { label: "Outros", icon: Archive }
};

const getFileIcon = (fileType) => {
  if (!fileType) return FileIcon;
  if (fileType.startsWith("image/")) return ImageIcon;
  if (fileType.includes("pdf") || fileType.includes("word")) return FileText;
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return FileSpreadsheet;
  if (fileType.includes("powerpoint") || fileType.includes("presentation")) return Presentation;
  if (fileType.startsWith("audio/")) return Music;
  if (fileType.startsWith("video/")) return Video;
  return FileIcon;
};

const getFileCategory = (fileType) => {
  if (!fileType) return "other";
  for (const [key, cat] of Object.entries(FILE_CATEGORIES)) {
    if (key === "all" || key === "other") continue;
    if (cat.types?.some(t => fileType.includes(t) || fileType.startsWith(t))) {
      return key;
    }
  }
  return "other";
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export default function ConversationFilesModal({
  open,
  onClose,
  conversation,
  users
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open && conversation?.id) {
      loadFiles();
    }
  }, [open, conversation?.id]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const messages = await ChatMessage.filter({ conversation_id: conversation.id });
      const fileMessages = messages.filter(m => 
        (m.type === "file" || m.type === "image") && m.file_url && !m.is_deleted
      );
      setFiles(fileMessages);
    } catch (error) {
      console.error("Erro ao carregar arquivos:", error);
    }
    setLoading(false);
  };

  const filteredFiles = files.filter(file => {
    // Category filter
    if (filter !== "all") {
      const category = getFileCategory(file.file_type);
      if (category !== filter) return false;
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const fileName = (file.file_name || "").toLowerCase();
      const senderName = (file.sender_name || "").toLowerCase();
      if (!fileName.includes(searchLower) && !senderName.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });

  const toggleSelect = (fileId) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const downloadFile = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "arquivo";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    } catch (error) {
      console.error("Erro ao baixar:", error);
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  const downloadSelected = async () => {
    if (selectedFiles.size === 0) return;
    
    setDownloading(true);
    const filesToDownload = filteredFiles.filter(f => selectedFiles.has(f.id));
    
    for (const file of filesToDownload) {
      await downloadFile(file.file_url, file.file_name);
      // Small delay between downloads
      await new Promise(r => setTimeout(r, 500));
    }
    
    setDownloading(false);
    setSelectedFiles(new Set());
  };

  const getSenderName = (email) => {
    const user = users?.find(u => u.email === email);
    return user?.display_name || user?.full_name || email;
  };

  // Group files by date (local tz)
  const groupedFiles = filteredFiles.reduce((groups, file) => {
    const date = getLocalDayKey(file.created_date);
    if (!date) return groups;
    if (!groups[date]) groups[date] = [];
    groups[date].push(file);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedFiles).sort((a, b) => new Date(b) - new Date(a));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <File className="w-5 h-5" />
            Arquivos da Conversa
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 pb-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar arquivos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FILE_CATEGORIES).map(([key, cat]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <cat.icon className="w-4 h-4" />
                    {cat.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selection bar */}
        {filteredFiles.length > 0 && (
          <div className="flex items-center justify-between py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="gap-2"
            >
              {selectedFiles.size === filteredFiles.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedFiles.size === filteredFiles.length ? "Desmarcar todos" : "Selecionar todos"}
            </Button>

            {selectedFiles.size > 0 && (
              <Button
                onClick={downloadSelected}
                disabled={downloading}
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {downloading ? "Baixando..." : `Baixar ${selectedFiles.size} arquivo(s)`}
              </Button>
            )}
          </div>
        )}

        {/* Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{filteredFiles.length} arquivo(s)</span>
          <span>•</span>
          <span>Tamanho máximo: {MAX_FILE_SIZE_LABEL}</span>
        </div>

        {/* Files list */}
        <div className="flex-1 -mx-6 px-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <File className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum arquivo encontrado</p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {sortedDates.map(date => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-gray-500 mb-3 sticky top-0 bg-white py-1">
                    {format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                  
                  <div className="grid gap-2">
                    {groupedFiles[date].map(file => {
                      const FileIcon = getFileIcon(file.file_type);
                      const isSelected = selectedFiles.has(file.id);
                      const isImage = file.type === "image" || file.file_type?.startsWith("image/");

                      return (
                        <div
                          key={file.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            isSelected ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50 border-gray-200"
                          }`}
                          onClick={() => toggleSelect(file.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(file.id)}
                            onClick={(e) => e.stopPropagation()}
                          />

                          {isImage && file.file_url ? (
                            <img
                              src={file.file_url}
                              alt={file.file_name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <FileIcon className="w-6 h-6 text-gray-500" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.file_name || "Arquivo"}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{getSenderName(file.sender_email)}</span>
                              <span>•</span>
                              <span>{formatFileSize(file.file_size)}</span>
                              <span>•</span>
                              <span>{format(new Date(file.created_date), "HH:mm")}</span>
                            </div>
                          </div>

                          <Badge variant="secondary" className="shrink-0">
                            {FILE_CATEGORIES[getFileCategory(file.file_type)]?.label || "Arquivo"}
                          </Badge>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file.file_url, file.file_name);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL };