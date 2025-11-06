
import React, { useState, useEffect } from "react";
import { UserStar } from "@/entities/UserStar";
import { User } from "@/entities/User";
import { Department } from "@/entities/Department";
import { getPublicUsers } from "@/functions/getPublicUsers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Trophy, Medal, Award, Calendar, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function Ranking() {
  const [stars, setStars] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [rankingByDepartment, setRankingByDepartment] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedDepartments, setExpandedDepartments] = useState({});

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (stars.length > 0 && users.length > 0 && departments.length > 0) {
      calculateRankingByDepartment();
    }
  }, [stars, users, departments, startDate, endDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      const [starsData, departmentsData] = await Promise.all([
        UserStar.list("-earned_date"),
        Department.list()
      ]);
      
      setStars(starsData);
      setDepartments(departmentsData);

      // NOVA ESTRATÉGIA: Usar função backend como proxy público
      let usersData = [];
      
      try {
        // Tenta usar a função backend que usa service role
        console.log("[Ranking] 🔄 Carregando usuários via função backend...");
        const response = await getPublicUsers();
        
        if (response.data?.users) {
          usersData = response.data.users;
          console.log(`[Ranking] ✅ ${usersData.length} usuários carregados via backend function`);
        } else {
          throw new Error("Resposta inválida da função backend");
        }
      } catch (error) {
        console.warn("[Ranking] ⚠️ Função backend falhou:", error.message);
        
        // FALLBACK: Descobre emails das estrelas e gera usuários básicos
        console.log("[Ranking] 🔄 Usando fallback: gerando usuários dos emails...");
        
        const uniqueEmails = new Set();
        uniqueEmails.add(userData.email);
        
        for (const star of starsData) {
          if (star.user_email) {
            uniqueEmails.add(star.user_email);
          }
        }
        
        console.log(`[Ranking] 🔍 ${uniqueEmails.size} emails únicos encontrados`);
        
        usersData = Array.from(uniqueEmails).map((email) => {
          const displayName = generateDisplayNameFromEmail(email);
          return {
            id: `fallback-${email}`,
            email: email,
            display_name: displayName,
            full_name: displayName,
            role: email === userData.email ? userData.role : "user",
            profile_picture: null,
            department_id: null
          };
        });
        
        console.log(`[Ranking] ✅ Fallback: ${usersData.length} usuários gerados`);
      }
      
      // Garantir que todos tenham display_name
      usersData = usersData.map(u => ({
        ...u,
        display_name: u.display_name || u.full_name || generateDisplayNameFromEmail(u.email)
      }));
      
      console.log(`[Ranking] 📊 Final: ${usersData.length} usuários, ${usersData.filter(u => u.profile_picture).length} com foto, ${usersData.filter(u => u.department_id).length} com departamento`);
      
      setUsers(usersData);
    } catch (error) {
      console.error("[Ranking] ❌ Erro ao carregar dados:", error);
    }
    setIsLoading(false);
  };

  const calculateRankingByDepartment = () => {
    let filteredStars = [...stars];

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

    const starsByUser = {};
    filteredStars.forEach(star => {
      if (!starsByUser[star.user_email]) {
        starsByUser[star.user_email] = [];
      }
      starsByUser[star.user_email].push(star);
    });

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

    Object.entries(starsByUser).forEach(([email, userStars]) => {
      const user = users.find(u => u.email === email);
      if (!user) return;

      const deptId = user.department_id || 'no_department';
      
      if (rankingByDept[deptId]) {
        rankingByDept[deptId].ranking.push({
          user_email: email,
          user_name: user.display_name || user.full_name || email,
          profile_picture: user.profile_picture,
          total_stars: userStars.length,
          stars: userStars,
          department_id: user.department_id
        });
      }
    });

    Object.keys(rankingByDept).forEach(deptId => {
      rankingByDept[deptId].ranking.sort((a, b) => b.total_stars - a.total_stars);
    });

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
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            🏆 Ranking de Estrelas por Departamento
          </h1>
          <p className="text-gray-600 text-lg">
            Competição entre usuários do mesmo departamento
          </p>
        </div>

        <Card className="shadow-lg border-2">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Filtrar por Período
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge 
                className="cursor-pointer hover:opacity-80 bg-blue-600 text-white px-4 py-2"
                onClick={() => setPeriod("thisMonth")}
              >
                Este Mês
              </Badge>
              <Badge 
                className="cursor-pointer hover:opacity-80 bg-purple-600 text-white px-4 py-2"
                onClick={() => setPeriod("lastMonth")}
              >
                Mês Passado
              </Badge>
              <Badge 
                className="cursor-pointer hover:opacity-80 bg-indigo-600 text-white px-4 py-2"
                onClick={() => setPeriod("thisYear")}
              >
                Este Ano
              </Badge>
              <Badge 
                className="cursor-pointer hover:opacity-80 bg-gray-600 text-white px-4 py-2"
                onClick={() => setPeriod("all")}
              >
                Todo o Período
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Top 3 de cada Departamento - VISÍVEL PARA TODOS */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
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
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-xl">{department.name}</CardTitle>
                      <Badge variant="outline" className="text-sm">
                        {ranking.length} {ranking.length === 1 ? 'participante' : 'participantes'}
                      </Badge>
                    </div>
                    {isAdmin && ranking.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDepartment(deptId)}
                        className="gap-2"
                      >
                        {expandedDepartments[deptId] ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Ver menos
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Ver ranking completo (Admin)
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <Card className="shadow-lg border-2 bg-blue-50">
          <CardContent className="pt-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              Como funciona o Sistema de Estrelas?
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">⭐</span>
                <span>Cada protocolo ou serviço <strong>único concluído</strong> vale 1 estrela</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">⭐</span>
                <span>Se você concluir o <strong>mesmo protocolo várias vezes</strong>, ganha apenas 1 estrela (não acumula)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">⭐</span>
                <span>Outros usuários também podem ganhar estrela do mesmo protocolo que você completou</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">⭐</span>
                <span>O ranking mostra quem tem mais <strong>protocolos/serviços únicos</strong> concluídos</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
