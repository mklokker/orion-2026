import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Award, 
  Search, 
  Eye, 
  Ban,
  Download,
  CheckCircle2
} from "lucide-react";
import { Certificate } from "@/entities/Certificate";
import { User } from "@/entities/User";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CertificateViewer from "./CertificateViewer";
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

export default function CertificatesManager({ open, onClose }) {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [certificateToRevoke, setCertificateToRevoke] = useState(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [certsData, usersData] = await Promise.all([
        Certificate.list("-issued_at"),
        User.list()
      ]);
      setCertificates(certsData);
      setUsers(usersData);
    } catch (error) {
      console.error("Erro ao carregar certificados:", error);
    }
    setLoading(false);
  };

  const getUserAvatar = (email) => {
    const user = users.find(u => u.email === email);
    return user?.profile_picture;
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleRevoke = async () => {
    if (!certificateToRevoke) return;

    try {
      await Certificate.update(certificateToRevoke.id, {
        is_revoked: true,
        revoked_reason: "Revogado pelo administrador"
      });
      toast({ title: "Certificado revogado com sucesso." });
      setShowRevokeDialog(false);
      setCertificateToRevoke(null);
      loadData();
    } catch (error) {
      toast({ title: "Erro ao revogar certificado.", variant: "destructive" });
    }
  };

  const filteredCertificates = certificates.filter(cert => 
    cert.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.certificate_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: certificates.length,
    active: certificates.filter(c => !c.is_revoked).length,
    revoked: certificates.filter(c => c.is_revoked).length
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Award className="w-5 h-5" />
              Gerenciar Certificados
            </DialogTitle>
          </DialogHeader>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Emitidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                <p className="text-sm text-gray-600">Ativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-red-600">{stats.revoked}</p>
                <p className="text-sm text-gray-600">Revogados</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, curso ou ID do certificado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : filteredCertificates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Nenhum certificado encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>ID do Certificado</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Emitido em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertificates.map(cert => (
                  <TableRow key={cert.id} className={cert.is_revoked ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={getUserAvatar(cert.user_email)} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            {getInitials(cert.user_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{cert.user_name}</p>
                          <p className="text-xs text-gray-500">{cert.user_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{cert.course_name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {cert.certificate_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      {cert.score ? (
                        <span className="font-medium text-green-600">{cert.score}%</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {format(new Date(cert.issued_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {cert.is_revoked ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="w-3 h-3" />
                          Revogado
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedCertificate(cert)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!cert.is_revoked && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => {
                              setCertificateToRevoke(cert);
                              setShowRevokeDialog(true);
                            }}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Certificate Viewer */}
      <CertificateViewer
        open={!!selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
        certificate={selectedCertificate}
      />

      {/* Revoke Confirmation */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar Certificado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar o certificado de "{certificateToRevoke?.user_name}"?
              Esta ação pode ser desfeita posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-red-600 hover:bg-red-700">
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}