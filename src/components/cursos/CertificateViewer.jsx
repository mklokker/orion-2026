import React, { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const CARTORIO_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e455ba8a2ae7e373df39bb/b1c65dc39_LOGOVERTICALAZUL-01.png";
const CARTORIO_NAME = "Ofício do Registro de Imóveis de São João del Rei";

export default function CertificateViewer({ open, onClose, certificate }) {
  const certificateRef = useRef(null);

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificado_${certificate.certificate_id}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    }
  };

  if (!certificate) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <div className="p-4 bg-gray-100 flex justify-between items-center">
          <h3 className="font-semibold">Certificado de Conclusão</h3>
          <div className="flex gap-2">
            <Button onClick={handleDownloadPDF} className="gap-2">
              <Download className="w-4 h-4" />
              Baixar PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Certificate Template */}
        <div 
          ref={certificateRef}
          className="bg-white relative"
          style={{ width: '100%', aspectRatio: '1.414/1', minHeight: '500px' }}
        >
          {/* Border Design */}
          <div className="absolute inset-3 border-4 border-double border-[#2d4a6f] rounded-lg" />
          <div className="absolute inset-5 border-2 border-[#2d4a6f]/60 rounded-lg" />

          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-between text-center p-10">
            {/* Header with Logo */}
            <div className="flex flex-col items-center pt-4">
              <img 
                src={CARTORIO_LOGO} 
                alt="Logo Cartório" 
                className="h-24 object-contain mb-3"
                crossOrigin="anonymous"
              />
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#2d4a6f] tracking-wide mt-2">
                CERTIFICADO
              </h1>
              <p className="text-base text-[#2d4a6f]/80 mt-1">de Conclusão de Curso</p>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col justify-center py-4">
              <p className="text-gray-600 mb-1 text-sm">Certificamos que</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 font-serif">
                {certificate.user_name}
              </h2>
              <p className="text-gray-600 mb-1 text-sm">concluiu com êxito o curso</p>
              <h3 className="text-xl md:text-2xl font-semibold text-[#2d4a6f] mb-3 px-8">
                {certificate.course_name}
              </h3>
              {certificate.score && certificate.score > 0 && (
                <p className="text-gray-600 mb-2 text-sm">
                  com aproveitamento de <span className="font-bold text-green-600">{certificate.score}%</span>
                </p>
              )}
              <p className="text-gray-600 text-sm">
                em {format(new Date(certificate.completion_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>

            {/* Footer */}
            <div className="w-full pt-4 border-t border-gray-200">
              <div className="flex justify-between items-end px-4">
                <div className="text-left">
                  <p className="text-xs text-gray-500">Certificado ID:</p>
                  <p className="text-xs font-mono text-gray-700">{certificate.certificate_id}</p>
                </div>
                <div className="text-center flex-1">
                  <div className="w-48 mx-auto border-t border-gray-400 pt-2">
                    <p className="text-xs text-gray-700 font-medium">{CARTORIO_NAME}</p>
                    <p className="text-xs text-gray-500 mt-1">Emissor</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Emitido em:</p>
                  <p className="text-xs text-gray-700">
                    {format(new Date(certificate.issued_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}