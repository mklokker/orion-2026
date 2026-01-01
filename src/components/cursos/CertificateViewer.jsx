import React, { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Award, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
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
          className="aspect-[1.414/1] bg-white p-8 relative"
          style={{ width: '100%', minHeight: '500px' }}
        >
          {/* Border Design */}
          <div className="absolute inset-4 border-4 border-double border-blue-800 rounded-lg" />
          <div className="absolute inset-6 border-2 border-blue-600 rounded-lg" />

          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center text-center p-12">
            {/* Header */}
            <div className="mb-6">
              <Award className="w-16 h-16 text-amber-500 mx-auto mb-2" />
              <h1 className="text-4xl font-serif font-bold text-blue-900 tracking-wide">
                CERTIFICADO
              </h1>
              <p className="text-lg text-blue-700 mt-1">de Conclusão</p>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-gray-600 mb-2">Certificamos que</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 font-serif">
                {certificate.user_name}
              </h2>
              <p className="text-gray-600 mb-2">concluiu com êxito o curso</p>
              <h3 className="text-2xl font-semibold text-blue-800 mb-4">
                {certificate.course_name}
              </h3>
              {certificate.score && (
                <p className="text-gray-600 mb-4">
                  com aproveitamento de <span className="font-bold text-green-600">{certificate.score}%</span>
                </p>
              )}
              <p className="text-gray-600">
                em {format(new Date(certificate.completion_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 w-full">
              <div className="flex justify-between items-end">
                <div className="text-left">
                  <p className="text-xs text-gray-500">Certificado ID:</p>
                  <p className="text-sm font-mono text-gray-700">{certificate.certificate_id}</p>
                </div>
                <div className="text-center">
                  <div className="w-40 border-t border-gray-400 pt-2">
                    <p className="text-sm text-gray-600">Assinatura Digital</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Emitido em:</p>
                  <p className="text-sm text-gray-700">
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