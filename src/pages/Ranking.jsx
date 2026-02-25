import React, { useState, useEffect } from "react";
import { UserStar } from "@/entities/UserStar";
import { User } from "@/entities/User";
import { Department } from "@/entities/Department";
import { Task } from "@/entities/Task";
import { Service } from "@/entities/Service";
import { getPublicUsers } from "@/functions/getPublicUsers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Trophy, Medal, Award, Calendar, Building2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCurrentUser, useUsers, useDepartments, useStars } from "@/components/useData";

const parseDateAsLocal = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getInitials = (name) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Função para gerar nome amigável do email
const generateDisplayNameFromEmail = (email) => {
  if (!email) return "Usuário";
  const namePart = email.split('@')[0];
  return namePart
    .replace(/[._]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const normalizeText = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "");
};

export default function Ranking() {
  // Use cached hooks
  const { data: currentUser } = useCurrentUser();
  const { data: users = [] } = useUsers();
  const { data: departments = [] } = useDepartments();
  const { data: stars = [], isLoading: isLoadingStars } = useStars();
  
  const isLoading = isLoadingStars;
  
  const [rankingByDepartment, setRankingByDepartment] = useState({});
  // Inicializa com o mês atual por padrão
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (stars.length > 0 && users.length > 0 && departments.length > 0) {
      calculateRankingByDepartment();
    }
  }, [stars, users, departments, startDate, endDate, searchQuery]);

  // Removed manual loadData since we use hooks now

  const calculateRankingByDepartment = () => {
    let filteredStars = [...stars];

    // Filtra por período
    if (startDate || endDate) {
      filteredStars = stars.filter(star => {
        const earnedDate = parseDateAsLocal(star.earned_date);
        if (!earnedDate) return false;

        const start = startDate ? parseDateAsLocal(startDate) : null;
        const end = endDate ? parseDateAsLocal(endDate) : null;

        if (start && end) {
          return earnedDate >= start && earnedDate <= end;
        }
        if (start) return earnedDate >= start;
        if (end) return earnedDate <= end;
        return true;
      });
    }

    // Inicializa ranking por departamento
    const rankingByDept = {};
    
    departments.forEach(dept => {
      rankingByDept[dept.id] = {
        department: dept,
        ranking: []
      };
    });

    rankingByDept['no_department'] = {
      department: { id: 'no_department', name: 'Sem Departamento' },
      ranking: []
    };

    // Agrupa estrelas por departamento E usuário
    // Cada usuário pode aparecer em múltiplos departamentos
    const userStarsByDept = {};
    
    filteredStars.forEach(star => {
      // Usa o department_id da estrela (do serviço/tarefa), não do usuário
      const deptId = star.department_id || 'no_department';
      const email = star.user_email;
      
      if (!userStarsByDept[deptId]) {
        userStarsByDept[deptId] = {};
      }
      if (!userStarsByDept[deptId][email]) {
        userStarsByDept[deptId][email] = [];
      }
      userStarsByDept[deptId][email].push(star);
    });

    // Constrói o ranking para cada departamento
    Object.entries(userStarsByDept).forEach(([deptId, userStars]) => {
      if (!rankingByDept[deptId]) {
        // Departamento não existe mais, usa "sem departamento"
        deptId = 'no_department';
      }
      
      Object.entries(userStars).forEach(([email, stars]) => {
        const user = users.find(u => u.email === email);
        if (!user) return;

        // Filtro de Busca por Nome
        if (searchQuery) {
          const normalizedSearch = normalizeText(searchQuery);
          const normalizedName = normalizeText(user.display_name || user.full_name || email);
          const normalizedEmail = normalizeText(email);
          
          if (!normalizedName.includes(normalizedSearch) && !normalizedEmail.includes(normalizedSearch)) {
            return;
          }
        }

        // Verifica se o usuário já existe neste departamento
        const existingIndex = rankingByDept[deptId].ranking.findIndex(r => r.user_email === email);
        if (existingIndex >= 0) {
          // Soma as estrelas
          rankingByDept[deptId].ranking[existingIndex].total_stars += stars.length;
          rankingByDept[deptId].ranking[existingIndex].stars.push(...stars);
        } else {
          rankingByDept[deptId].ranking.push({
            user_email: email,
            user_name: user.display_name || user.full_name || email,
            profile_picture: user.profile_picture,
            total_stars: stars.length,
            stars: stars,
            department_id: deptId
          });
        }
      });
    });

    // Ordena cada departamento por total de estrelas
    Object.keys(rankingByDept).forEach(deptId => {
      rankingByDept[deptId].ranking.sort((a, b) => b.total_stars - a.total_stars);
    });

    // Remove departamentos vazios
    Object.keys(rankingByDept).forEach(deptId => {
      if (rankingByDept[deptId].ranking.length === 0) {
        delete rankingByDept[deptId];
      }
    });

    setRankingByDepartment(rankingByDept);
  };

  const setPeriod = (periodType) => {
    const today = new Date();
    let start, end;

    switch (periodType) {
      case "thisMonth":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "lastMonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case "thisYear":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case "all":
        setStartDate("");
        setEndDate("");
        return;
      default:
        return;
    }

    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
  };

  const getRankIcon = (position) => {
    switch (position) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 2:
        return <Medal className="w-7 h-7 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-600" />;
      default:
        return <span className="text-2xl font-bold text-gray-400">#{position}</span>;
    }
  };

  const getRankBadgeColor = (position) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
      case 3:
        return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const toggleDepartment = (deptId) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [deptId]: !prev[deptId]
    }));
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-5xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            🏆 Ranking de Estrelas
          </h1>
          <p className="text-gray-600 text-sm md:text-lg hidden md:block">
            Competição entre usuários do mesmo departamento
          </p>
        </div>

        <Card className="shadow-lg border-2">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 py-3 md:py-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Calendar className="w-4 h-4 md:w-5 md:h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
              <div className="space-y-1 md:space-y-2">
                <label className="text-xs md:text-sm font-medium">Buscar Usuário</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Nome ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 md:h-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:contents">
                <div className="space-y-1 md:space-y-2">
                  <label className="text-xs md:text-sm font-medium">De</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 md:h-10"
                  />
                </div>
                <div className="space-y-1 md:space-y-2">
                  <label className="text-xs md:text-sm font-medium">Até</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 md:h-10"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              <Badge 
                className="cursor-pointer hover:opacity-80 bg-blue-600 text-white px-2.5 py-1 md:px-4 md:py-2 text-xs md:text-sm"
                onClick={() => setPeriod("thisMonth")}
              >
                Este Mês
              </Badge>
              <Badge 
                className="cursor-pointer hover:opacity-80 bg-purple-600 text-white px-2.5 py-1 md:px-4 md:py-2 text-xs md:text-sm"
                onClick={() => setPeriod("lastMonth")}
              >
                Mês Passado
              </Badge>
              <Badge 
                className="cursor-pointer hover:opacity-80 bg-indigo-600 text-white px-2.5 py-1 md:px-4 md:py-2 text-xs md:text-sm"
                onClick={() => setPeriod("thisYear")}
              >
                Este Ano
              </Badge>
              <Badge 
                className="cursor-pointer hover:opacity-80 bg-gray-600 text-white px-2.5 py-1 md:px-4 md:py-2 text-xs md:text-sm"
                onClick={() => setPeriod("all")}
              >
                Tudo
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Top 3 de cada Departamento - VISÍVEL PARA TODOS */}
        <div className="space-y-4 md:space-y-6">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
            Destaques por Departamento
          </h2>
          
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Carregando departamentos...</p>
            </div>
          ) : Object.keys(rankingByDepartment).length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhuma estrela conquistada em nenhum departamento ainda!</p>
              <p className="text-gray-400 text-sm mt-2">
                Complete tarefas e serviços para ganhar estrelas e aparecer no ranking do seu departamento.
              </p>
            </div>
          ) : (
            Object.entries(rankingByDepartment).map(([deptId, { department, ranking }]) => (
              <Card key={deptId} className="shadow-lg border-2">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b py-3 md:py-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <Building2 className="w-4 h-4 md:w-5 md:h-5 text-blue-600 shrink-0" />
                      <CardTitle className="text-base md:text-xl truncate">{department.name}</CardTitle>
                      <Badge variant="outline" className="text-xs hidden md:flex">
                        {ranking.length} {ranking.length === 1 ? 'participante' : 'participantes'}
                      </Badge>
                    </div>
                    {isAdmin && ranking.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDepartment(deptId)}
                        className="gap-1 md:gap-2 text-xs md:text-sm shrink-0"
                      >
                        {expandedDepartments[deptId] ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden md:inline">Ver menos</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden md:inline">Ver completo</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {ranking.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nenhuma estrela conquistada neste departamento ainda
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {/* Top 3 - SEMPRE VISÍVEL PARA TODOS */}
                      {/* Mobile: Layout horizontal compacto */}
                      <div className="md:hidden space-y-2">
                        {ranking.slice(0, 3).map((item, index) => (
                          <div 
                            key={item.user_email} 
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                              index === 0 ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-yellow-100' :
                              index === 1 ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100' :
                              'border-orange-300 bg-gradient-to-r from-orange-50 to-orange-100'
                            }`}
                          >
                            <div className="flex-shrink-0 w-8 flex justify-center">
                              {getRankIcon(index + 1)}
                            </div>
                            <Avatar className="w-12 h-12 border-2 border-white shadow">
                              <AvatarImage src={item.profile_picture} alt={item.user_name} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold">
                                {getInitials(item.user_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-gray-900 truncate">{item.user_name}</h3>
                            </div>
                            <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
                              <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                              <span className="text-lg font-bold text-yellow-800">{item.total_stars}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Desktop: Cards grandes */}
                      <div className="hidden md:grid md:grid-cols-3 gap-4">
                        {ranking.slice(0, 3).map((item, index) => (
                          <Card 
                            key={item.user_email} 
                            className={`shadow-xl border-4 transition-all hover:scale-105 ${
                              index === 0 ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100' :
                              index === 1 ? 'border-gray-400 bg-gradient-to-br from-gray-50 to-gray-100' :
                              'border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100'
                            }`}
                          >
                            <CardContent className="pt-6 text-center space-y-3">
                              <div className="flex justify-center">
                                {getRankIcon(index + 1)}
                              </div>
                              <Avatar className="w-20 h-20 mx-auto border-4 border-white shadow-lg">
                                <AvatarImage src={item.profile_picture} alt={item.user_name} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xl font-bold">
                                  {getInitials(item.user_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="text-lg font-bold text-gray-900">{item.user_name}</h3>
                                <p className="text-xs text-gray-600">{item.user_email}</p>
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                <span className="text-2xl font-bold text-gray-900">{item.total_stars}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Ranking Completo - Apenas para Admin */}
                      {isAdmin && ranking.length > 3 && expandedDepartments[deptId] && (
                        <div className="mt-6 border-t pt-6">
                          <h3 className="text-lg font-semibold mb-4 text-gray-700">
                            Ranking Completo (Visível apenas para Administradores)
                          </h3>
                          <div className="space-y-2">
                            {ranking.map((item, index) => (
                              <div 
                                key={item.user_email}
                                className={`p-3 rounded-lg flex items-center gap-4 ${
                                  index < 3 ? 'bg-gradient-to-r from-yellow-50/50 to-orange-50/50' : 'bg-gray-50'
                                }`}
                              >
                                <div className="w-12 flex justify-center">
                                  {index < 3 ? (
                                    getRankIcon(index + 1)
                                  ) : (
                                    <Badge className={getRankBadgeColor(index + 1)}>
                                      #{index + 1}
                                    </Badge>
                                  )}
                                </div>
                                
                                <Avatar className="w-12 h-12 border-2 border-white shadow">
                                  <AvatarImage src={item.profile_picture} alt={item.user_name} />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold">
                                    {getInitials(item.user_name)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 truncate">{item.user_name}</h3>
                                  <p className="text-sm text-gray-500 truncate">{item.user_email}</p>
                                </div>

                                <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1.5 rounded-full">
                                  <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                                  <span className="text-lg font-bold text-yellow-800">{item.total_stars}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="shadow-lg border-2 bg-blue-50 hidden md:block">
          <CardContent className="pt-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              Como funciona o Sistema de Estrelas?
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">⭐</span>
                <span>Cada protocolo ou serviço <strong>único concluído</strong> vale 1 estrela <strong>por departamento</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">⭐</span>
                <span>Um mesmo usuário pode aparecer em <strong>múltiplos departamentos</strong> se trabalhou em diferentes setores</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">⭐</span>
                <span>Quando um serviço é <strong>finalizado em Conferência</strong>, um novo ciclo começa e o mesmo protocolo pode gerar estrelas novamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">⭐</span>
                <span><strong>Transferir</strong> um serviço gera estrela mas <strong>não fecha o ciclo</strong> - apenas finalizar em Conferência fecha</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}