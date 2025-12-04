import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Document } from "@/entities/Document";
import { Search, FileText } from "lucide-react";
import { format } from "date-fns";

export default function DocumentSelector({ open, onClose, onSelect }) {
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await Document.list("-created_date");
      setDocuments(docs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = documents.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar Documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Buscar documento..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-72 border rounded-md p-2">
             {loading ? (
               <p className="text-center text-sm text-gray-500 py-4">Carregando...</p>
             ) : filtered.length === 0 ? (
               <p className="text-center text-sm text-gray-500 py-4">Nenhum documento encontrado</p>
             ) : (
               <div className="space-y-2">
                 {filtered.map(doc => (
                   <div 
                     key={doc.id} 
                     className="p-3 hover:bg-gray-50 cursor-pointer rounded border flex items-center gap-3"
                     onClick={() => onSelect(doc)}
                   >
                     <div className="p-2 bg-blue-50 text-blue-600 rounded">
                       <FileText className="w-5 h-5" />
                     </div>
                     <div className="flex-1 overflow-hidden">
                       <p className="font-medium text-sm truncate">{doc.title}</p>
                       <p className="text-xs text-gray-500">
                         {format(new Date(doc.created_date), "dd/MM/yyyy")} • {doc.uploaded_by_name}
                       </p>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </ScrollArea>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}