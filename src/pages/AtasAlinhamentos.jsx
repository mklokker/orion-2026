import React, { useState, useEffect } from "react";
import { MeetingMinutes } from "@/entities/MeetingMinutes";
import { TeamAlignment } from "@/entities/TeamAlignment";
import { AlignmentCategory } from "@/entities/AlignmentCategory";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Plus,
  FileText,
  Users,
  Calendar,
  Clock,
  MapPin,
  Filter,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Tag,
  Settings
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CreateMeetingMinutesModal from "@/components/atas/CreateMeetingMinutesModal";
import CreateAlignmentModal from "@/components/atas/CreateAlignmentModal";
import MeetingMinutesViewModal from "@/components/atas/MeetingMinutesViewModal";
import AlignmentViewModal from "@/components/atas/AlignmentViewModal";
import CategoryManagerModal from "@/components/atas/CategoryManagerModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const priorityColors = {
  baixa: "bg-gray-100 text-gray-700",
  media: "bg-blue-100 text-blue-700",
  alta: "bg-orange-100 text-orange-700",
  urgente: "bg-red-100 text-red-700"
};

const priorityLabels = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente"
};

export default function AtasAlinhamentos() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("alinhamentos");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  
  const [meetings, setMeetings] = useState([]);
  const [alignments, setAlignments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showCreateAlignment, setShowCreateAlignment] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [viewingMeeting, setViewingMeeting] = useState(null);
  const [viewingAlignment, setViewingAlignment] = useState(null);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [editingAlignment, setEditingAlignment] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, meetingsData, alignmentsData, categoriesData, usersData] = await Promise.all([
        User.me(),
        MeetingMinutes.list("-meeting_date"),
        TeamAlignment.list("-alignment_date"),
        AlignmentCategory.list(),
        User.list()
      ]);
      setCurrentUser(userData);
      setMeetings(meetingsData);
      setAlignments(alignmentsData);
      setCategories(categoriesData);
      setUsers(usersData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    }
  };

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.responsible?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || m.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredAlignments = alignments.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (categoryName) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat?.color || "#3B82F6";
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent flex items-center gap-3">
              <FileText className="w-10 h-10 text-blue-600" />
              Atas e Alinhamentos
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie atas de reunião e alinhamentos da equipe
            </p>
          </div>

          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => setShowCategoryManager(true)} className="gap-2">
                <Settings className="w-4 h-4" />
                Categorias
              </Button>
            )}
            <Button
              onClick={() => activeTab === "atas" ? setShowCreateMeeting(true) : setShowCreateAlignment(true)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Plus className="w-4 h-4" />
              {activeTab === "atas" ? "Nova Ata" : "Novo Alinhamento"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="alinhamentos" className="gap-2">
              <Users className="w-4 h-4" />
              Alinhamentos ({alignments.length})
            </TabsTrigger>
            <TabsTrigger value="atas" className="gap-2">
              <FileText className="w-4 h-4" />
              Atas de Reunião ({meetings.length})
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Categorias</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Alinhamentos Tab */}
          <TabsContent value="alinhamentos" className="mt-4">
            {filteredAlignments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Nenhum alinhamento encontrado</p>
                  <Button onClick={() => setShowCreateAlignment(true)} className="mt-4 gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Primeiro Alinhamento
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredAlignments.map(alignment => {
                  const isAcknowledged = alignment.acknowledged_by?.includes(currentUser?.email);
                  return (
                    <Card 
                      key={alignment.id} 
                      className="hover:shadow-lg transition-all cursor-pointer border-l-4"
                      style={{ borderLeftColor: getCategoryColor(alignment.category) }}
                      onClick={() => setViewingAlignment(alignment)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge style={{ backgroundColor: getCategoryColor(alignment.category) }} className="text-white">
                                {alignment.category}
                              </Badge>
                              <Badge className={priorityColors[alignment.priority]}>
                                {priorityLabels[alignment.priority]}
                              </Badge>
                              {isAcknowledged && (
                                <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Lido
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg truncate">{alignment.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{alignment.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(alignment.alignment_date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {alignment.responsible}
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {alignment.acknowledged_by?.length || 0} confirmaram
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Atas Tab */}
          <TabsContent value="atas" className="mt-4">
            {filteredMeetings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Nenhuma ata de reunião encontrada</p>
                  <Button onClick={() => setShowCreateMeeting(true)} className="mt-4 gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Primeira Ata
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredMeetings.map(meeting => (
                  <Card 
                    key={meeting.id} 
                    className="hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setViewingMeeting(meeting)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {meeting.category && (
                              <Badge variant="outline">{meeting.category}</Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg">{meeting.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{meeting.agenda}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(meeting.meeting_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            {meeting.meeting_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {meeting.meeting_time}
                              </span>
                            )}
                            {meeting.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {meeting.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {meeting.participants?.length || 0} participantes
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateMeetingMinutesModal
        open={showCreateMeeting}
        onClose={() => { setShowCreateMeeting(false); setEditingMeeting(null); }}
        meeting={editingMeeting}
        categories={categories}
        users={users}
        onSave={loadData}
      />

      <CreateAlignmentModal
        open={showCreateAlignment}
        onClose={() => { setShowCreateAlignment(false); setEditingAlignment(null); }}
        alignment={editingAlignment}
        categories={categories}
        users={users}
        onSave={loadData}
      />

      <MeetingMinutesViewModal
        open={!!viewingMeeting}
        onClose={() => setViewingMeeting(null)}
        meeting={viewingMeeting}
        users={users}
        isAdmin={isAdmin}
        onEdit={(m) => { setEditingMeeting(m); setShowCreateMeeting(true); setViewingMeeting(null); }}
        onDelete={loadData}
      />

      <AlignmentViewModal
        open={!!viewingAlignment}
        onClose={() => setViewingAlignment(null)}
        alignment={viewingAlignment}
        currentUser={currentUser}
        users={users}
        isAdmin={isAdmin}
        onEdit={(a) => { setEditingAlignment(a); setShowCreateAlignment(true); setViewingAlignment(null); }}
        onDelete={loadData}
        onAcknowledge={loadData}
      />

      <CategoryManagerModal
        open={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        onUpdate={loadData}
      />
    </div>
  );
}