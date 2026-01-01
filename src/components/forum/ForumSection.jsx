import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Filter,
  HelpCircle,
  MessageCircle,
  Lightbulb,
  Share2,
  CheckCircle2,
  Clock
} from "lucide-react";
import { ForumTopic } from "@/entities/ForumTopic";
import { User } from "@/entities/User";
import ForumTopicList from "./ForumTopicList";
import CreateTopicModal from "./CreateTopicModal";
import TopicView from "./TopicView";

export default function ForumSection({ courseId = null, courseName = null, currentUser }) {
  const [topics, setTopics] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filter = courseId ? { course_id: courseId } : {};
      const [topicsData, usersData] = await Promise.all([
        ForumTopic.filter(filter, "-created_date"),
        User.list()
      ]);
      
      // For general forum, include topics without course_id
      if (!courseId) {
        const generalTopics = topicsData.filter(t => !t.course_id);
        setTopics(generalTopics);
      } else {
        setTopics(topicsData);
      }
      
      setUsers(usersData);
    } catch (error) {
      console.error("Erro ao carregar fórum:", error);
    }
    setLoading(false);
  };

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = 
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || topic.category === categoryFilter;
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "resolved" && topic.is_resolved) ||
      (statusFilter === "open" && !topic.is_resolved && !topic.is_closed);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: topics.length,
    resolved: topics.filter(t => t.is_resolved).length,
    open: topics.filter(t => !t.is_resolved && !t.is_closed).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            {courseName ? `Fórum - ${courseName}` : "Fórum Geral"}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Tire dúvidas e compartilhe conhecimento com a comunidade
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Tópico
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-600">Total de Tópicos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.resolved}</p>
            <p className="text-sm text-gray-600">Resolvidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.open}</p>
            <p className="text-sm text-gray-600">Em Aberto</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar tópicos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                <SelectItem value="duvida">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" /> Dúvidas
                  </div>
                </SelectItem>
                <SelectItem value="discussao">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Discussões
                  </div>
                </SelectItem>
                <SelectItem value="sugestao">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Sugestões
                  </div>
                </SelectItem>
                <SelectItem value="compartilhamento">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4" /> Compartilhamentos
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Em Aberto</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Topics List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Carregando tópicos...
          </CardContent>
        </Card>
      ) : (
        <ForumTopicList 
          topics={filteredTopics} 
          users={users}
          onSelectTopic={setSelectedTopic}
        />
      )}

      {/* Create Topic Modal */}
      <CreateTopicModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        courseId={courseId}
        currentUser={currentUser}
        onCreated={loadData}
      />

      {/* Topic View Modal */}
      <TopicView
        open={!!selectedTopic}
        onClose={() => setSelectedTopic(null)}
        topic={selectedTopic}
        currentUser={currentUser}
        users={users}
        isAdmin={isAdmin}
        onUpdate={() => {
          loadData();
          // Refresh selected topic
          if (selectedTopic) {
            ForumTopic.filter({ id: selectedTopic.id }).then(([updated]) => {
              if (updated) setSelectedTopic(updated);
            });
          }
        }}
      />
    </div>
  );
}