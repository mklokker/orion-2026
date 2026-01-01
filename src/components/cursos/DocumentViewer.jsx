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
        className={`p-0 overflow-hidden ${
          isFullscreen 
            ? 'max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none' 
            : 'max-w-5xl w-[90vw] h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              document.file_type === 'pdf' ? 'bg-red-100 text-red-600' :
              document.file_type === 'word' ? 'bg-blue-100 text-blue-600' :
              document.file_type === 'excel' ? 'bg-green-100 text-green-600' :
              'bg-orange-100 text-orange-600'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm line-clamp-1">{document.title}</h3>
              <p className="text-xs text-gray-500">{document.file_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownload}
              title="Baixar"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleOpenExternal}
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleFullscreen}
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="flex-1 bg-gray-200" style={{ height: 'calc(100% - 56px)' }}>
          {document.file_type === 'pdf' ? (
            <iframe
              src={`${viewerUrl}#toolbar=1&navpanes=1&scrollbar=1`}
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