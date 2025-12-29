import React, { useState, useEffect } from "react";
import { Department } from "@/entities/Department";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Building2, Users, Upload, Palette, Database } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DepartmentViewEditModal from "../components/admin/DepartmentViewEditModal";
import ImportTasksModal from "../components/admin/ImportTasksModal";
import AppearanceSettings from "../components/admin/AppearanceSettings";
import BackupRestore from "../components/admin/BackupRestore";
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

// Funções helper declaradas antes do componente
const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getUserDisplayName = (user) => {
  return user?.display_name || user?.full_name || "Usuário";
};

export default function Admin() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [newDepartment, setNewDepartment] = useState({ 
    name: "", 
    description: "",
    days_before_overdue: 0
  });
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);

  useEffect(() => {
    checkAdmin();
    loadData();
  }, []);

  const checkAdmin = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Erro ao verificar usuário:", error);
    }
  };

  const loadData = async () => {
    try {
      const [departmentsData, usersData] = await Promise.all([
        Department.list("-created_date"),
        User.list()
      ]);
      setDepartments(departmentsData);
      setUsers(usersData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const createDepartment = async () => {
    if (!newDepartment.name) {
      toast({
        title: "Erro",
        description: "O nome do departamento é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      await Department.create(newDepartment);
      toast({
        title: "Sucesso!",
        description: "Departamento criado com sucesso.",
      });
      setNewDepartment({ name: "", description: "", days_before_overdue: 0 });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar departamento.",
        variant: "destructive"
      });
    }
  };

  const deleteDepartment = async (id) => {
    try {
      await Department.delete(id);
      toast({
        title: "Sucesso!",
        description: "Departamento removido com sucesso.",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover departamento.",
        variant: "destructive"
      });
    }
  };

  const handleViewDepartment = (department) => {
    setSelectedDepartment(department);
    setShowDepartmentModal(true);
  };

  const handleDepartmentUpdate = () => {
    loadData();
  };

  const handleEditUser = (user) => {
    setEditingUser({ 
      ...user, 
      display_name: user.display_name || user.full_name,
      department_id: user.department_id || "" // Ensure it's a string for Select value
    });
    setShowEditUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser.display_name.trim()) {
      toast({
        title: "Erro",
        description: "O nome de exibição do usuário é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      await User.update(editingUser.id, {
        display_name: editingUser.display_name.trim(),
        department_id: editingUser.department_id === "" ? null : editingUser.department_id
      });

      toast({
        title: "Sucesso!",
        description: "Usuário atualizado com sucesso.",
      });

      setShowEditUserModal(false);
      setEditingUser(null);
      loadData();
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário.",
        variant: "destructive"
      });
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
              Administração
            </h1>
            <p className="text-gray-600 mt-2">Gerencie o sistema</p>
          </div>
          <Button
            onClick={() => setShowImportModal(true)}
            className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <Upload className="w-4 h-4" />
            Importar Tarefas
          </Button>
        </div>

        <Tabs defaultValue="departments" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="departments" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Departamentos</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Aparência</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Backup</span>
            </TabsTrigger>
          </TabsList>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Criar Departamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dept-name">Nome do Departamento *</Label>
                    <Input
                      id="dept-name"
                      placeholder="Ex: Registro de Imóveis"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dept-desc">Descrição</Label>
                    <Textarea
                      id="dept-desc"
                      placeholder="Descrição do departamento (opcional)"
                      value={newDepartment.description}
                      onChange={(e) => setNewDepartment({...newDepartment, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="days-before">Dias antes de virar Atrasada</Label>
                    <Input
                      id="days-before"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newDepartment.days_before_overdue}
                      onChange={(e) => setNewDepartment({...newDepartment, days_before_overdue: parseInt(e.target.value) || 0})}
                    />
                    <p className="text-xs text-gray-500">
                      Tarefas "Em Execução" virarão automaticamente para "Atrasada" quando faltarem X dias para a data de término
                    </p>
                  </div>
                  <Button
                    onClick={createDepartment}
                    className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Departamento
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0">
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Departamentos ({departments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {departments.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nenhum departamento cadastrado
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {departments.map(dept => (
                        <Card 
                          key={dept.id} 
                          className="border-2 hover:border-blue-300 transition-colors cursor-pointer"
                          onClick={() => handleViewDepartment(dept)}
                        >
                          <CardContent className="p-4 flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                              {dept.description && (
                                <p className="text-sm text-gray-600 mt-1">{dept.description}</p>
                              )}
                              {dept.days_before_overdue > 0 && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  Virada automática: {dept.days_before_overdue} {dept.days_before_overdue === 1 ? 'dia' : 'dias'} antes
                                </Badge>
                              )}
                            </div>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  deleteDepartment(dept.id);
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="shadow-lg border-0">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Usuários do Sistema ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-16">Avatar</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Cadastro</TableHead>
                        {isAdmin && <TableHead className="w-12">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(user => {
                        const userDept = departments.find(d => d.id === user.department_id);
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Avatar className="w-10 h-10 border-2 border-gray-200">
                                <AvatarImage src={user.profile_picture} alt={getUserDisplayName(user)} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-sm">
                                  {getInitials(getUserDisplayName(user))}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{getUserDisplayName(user)}</TableCell>
                            <TableCell className="text-gray-600">{user.email}</TableCell>
                            <TableCell>
                              {userDept ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {userDept.name}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">Sem departamento</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  user.role === 'admin' 
                                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0' 
                                    : 'bg-gray-100 text-gray-800'
                                }
                              >
                                {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {new Date(user.created_date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  Editar
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <AppearanceSettings />
          </TabsContent>

          {/* Backup Tab */}
          <TabsContent value="backup">
            {isAdmin && <BackupRestore />}
          </TabsContent>
        </Tabs>

      </div>

      {selectedDepartment && (
        <DepartmentViewEditModal
          open={showDepartmentModal}
          onClose={() => {
            setShowDepartmentModal(false);
            setSelectedDepartment(null);
          }}
          department={selectedDepartment}
          onUpdate={handleDepartmentUpdate}
        />
      )}

      <ImportTasksModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        departments={departments}
        onImportComplete={loadData}
      />

      <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_display_name">Nome de Exibição *</Label>
                <Input
                  id="edit_display_name"
                  value={editingUser.display_name}
                  onChange={(e) => setEditingUser({ ...editingUser, display_name: e.target.value })}
                  placeholder="Nome completo do usuário"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_department">Departamento</Label>
                <Select 
                  value={editingUser.department_id} 
                  onValueChange={(value) => setEditingUser({ ...editingUser, department_id: value })}
                >
                  <SelectTrigger id="edit_department">
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhum departamento</SelectItem> {/* Use empty string for no department */}
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  value={editingUser.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  O email não pode ser alterado.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_role">Função</Label>
                <Input
                  id="edit_role"
                  value={editingUser.role === 'admin' ? 'Administrador' : 'Usuário'}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  A função (admin/user) deve ser alterada no Dashboard do Base44.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUserModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}