import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Maximize2, 
  Minimize2, 
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Presentation,
  File
} from "lucide-react";

const FILE_ICONS = {
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  powerpoint: Presentation
};

export default function DocumentViewer({ open, onClose, document }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!document) return null;

  const Icon = FILE_ICONS[document.file_type] || File;

  // Google Docs Viewer for Office files, direct embed for PDF
  const getViewerUrl = () => {
    const encodedUrl = encodeURIComponent(document.file_url);
    
    if (document.file_type === 'pdf') {
      return document.file_url;
    }
    
    // Use Google Docs Viewer for Office files (Word, Excel, PowerPoint)
    return `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
  };

  // Microsoft Office Online Viewer (alternative, better for PowerPoint)
  const getOfficeViewerUrl = () => {
    const encodedUrl = encodeURIComponent(document.file_url);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  };

  const handleDownload = () => {
    window.open(document.file_url, '_blank');
  };

  const handleOpenExternal = () => {
    if (document.file_type === 'pdf') {
      window.open(document.file_url, '_blank');
    } else {
      window.open(getOfficeViewerUrl(), '_blank');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const viewerUrl = document.file_type === 'powerpoint' 
    ? getOfficeViewerUrl() 
    : getViewerUrl();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className={`p-0 overflow-hidden flex flex-col ${
          isFullscreen 
            ? 'max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none' 
            : 'max-w-[95vw] w-[95vw] h-[92vh] max-h-[92vh]'
        }`}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800 text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded ${
              document.file_type === 'pdf' ? 'bg-red-500/20 text-red-300' :
              document.file_type === 'word' ? 'bg-blue-500/20 text-blue-300' :
              document.file_type === 'excel' ? 'bg-green-500/20 text-green-300' :
              'bg-orange-500/20 text-orange-300'
            }`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm truncate">{document.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownload}
              title="Baixar"
              className="text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleOpenExternal}
              title="Abrir em nova aba"
              className="text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleFullscreen}
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Document Viewer - takes all remaining space */}
        <div className="flex-1 bg-gray-900 min-h-0">
          {document.file_type === 'pdf' ? (
            <iframe
              src={`${viewerUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-full border-0"
              title={document.title}
            />
          ) : (
            <iframe
              src={viewerUrl}
              className="w-full h-full border-0"
              title={document.title}
              allowFullScreen
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}