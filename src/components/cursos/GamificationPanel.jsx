import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trophy, 
  Star, 
  Flame, 
  Video, 
  FileQuestion, 
  Award,
  Crown,
  Medal,
  Target,
  Sparkles,
  Play,
  CheckCircle2,
  GraduationCap,
  Brain,
  Zap,
  Coins
} from "lucide-react";
import { UserPoints } from "@/entities/UserPoints";
import { UserBadge } from "@/entities/UserBadge";
import { User } from "@/entities/User";
import { BADGES, POINTS } from "./GamificationService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ICON_MAP = {
  Play, Trophy, Award, Star, Video, FileQuestion, CheckCircle2,
  GraduationCap, Brain, Zap, Coins, Crown, Sparkles, Flame,
  Medal, Target
};

const getIcon = (iconName) => ICON_MAP[iconName] || Star;

export default function GamificationPanel({ currentUser }) {
  const [userPoints, setUserPoints] = useState(null);
  const [userBadges, setUserBadges] = useState([]);
  const [allUsersPoints, setAllUsersPoints] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pointsData, badgesData, allPoints, usersData] = await Promise.all([
        UserPoints.filter({ user_email: currentUser?.email }),
        UserBadge.filter({ user_email: currentUser?.email }),
        UserPoints.list("-total_points"),
        User.list()
      ]);

      setUserPoints(pointsData[0] || null);
      setUserBadges(badgesData);
      setAllUsersPoints(allPoints);
      setUsers(usersData);
    } catch (error) {
      console.error("Erro ao carregar dados de gamificação:", error);
    }
    setLoading(false);
  };

  const getUserInfo = (email) => {
    const user = users.find(u => u.email === email);
    return {
      name: user?.display_name || user?.full_name || email.split('@')[0],
      avatar: user?.profile_picture
    };
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getUserRank = () => {
    if (!currentUser || allUsersPoints.length === 0) return 0;
    const idx = allUsersPoints.findIndex(p => p.user_email === currentUser.email);
    return idx >= 0 ? idx + 1 : allUsersPoints.length + 1;
  };

  const getNextBadgeProgress = () => {
    if (!userPoints) return null;

    const progressTargets = [
      { current: userPoints.videos_watched || 0, target: 10, label: "Maratonista (10 vídeos)", icon: Video },
      { current: userPoints.quizzes_passed || 0, target: 5, label: "Estudante Dedicado (5 provas)", icon: CheckCircle2 },
      { current: userPoints.courses_completed || 0, target: 3, label: "Triplo Conhecimento (3 cursos)", icon: GraduationCap },
      { current: userPoints.total_points || 0, target: 500, label: "Acumulador (500 pts)", icon: Coins }
    ];

    // Find first incomplete target
    return progressTargets.find(t => t.current < t.target);
  };

  const nextBadge = getNextBadgeProgress();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500 rounded-xl">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-700">
                  {userPoints?.total_points || 0}
                </p>
                <p className="text-sm text-amber-600">Pontos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500 rounded-xl">
                <Medal className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-700">
                  {userBadges.length}
                </p>
                <p className="text-sm text-purple-600">Badges</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500 rounded-xl">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-700">
                  {userPoints?.current_streak || 0}
                </p>
                <p className="text-sm text-orange-600">Dias Seguidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-xl">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-700">
                  #{getUserRank()}
                </p>
                <p className="text-sm text-blue-600">Ranking</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Badge Progress */}
      {nextBadge && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Próxima Conquista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <nextBadge.icon className="w-8 h-8 text-gray-400" />
              <div className="flex-1">
                <p className="font-medium text-sm">{nextBadge.label}</p>
                <Progress 
                  value={(nextBadge.current / nextBadge.target) * 100} 
                  className="h-2 mt-2" 
                />
                <p className="text-xs text-gray-500 mt-1">
                  {nextBadge.current} / {nextBadge.target}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="badges">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="badges">Meus Badges</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="mt-4">
          {userBadges.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Medal className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Você ainda não conquistou nenhum badge.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Continue estudando para desbloquear conquistas!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userBadges.map(badge => {
                const IconComponent = getIcon(badge.badge_icon);
                return (
                  <Card key={badge.id} className="text-center hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className={`w-16 h-16 rounded-full ${badge.badge_color} flex items-center justify-center mx-auto mb-3`}>
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-semibold text-sm">{badge.badge_name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{badge.badge_description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(badge.earned_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* All Badges Preview */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Todos os Badges Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.values(BADGES).map(badge => {
                  const earned = userBadges.some(b => b.badge_id === badge.id);
                  const IconComponent = getIcon(badge.icon);
                  return (
                    <div
                      key={badge.id}
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        earned ? badge.color : 'bg-gray-200'
                      }`}
                      title={`${badge.name}: ${badge.description}`}
                    >
                      <IconComponent className={`w-6 h-6 ${earned ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Video className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{userPoints?.videos_watched || 0}</p>
                <p className="text-sm text-gray-600">Vídeos Assistidos</p>
                <p className="text-xs text-green-600 mt-1">+{POINTS.VIDEO_WATCHED} pts cada</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <FileQuestion className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{userPoints?.quizzes_passed || 0}</p>
                <p className="text-sm text-gray-600">Provas Aprovadas</p>
                <p className="text-xs text-green-600 mt-1">+{POINTS.QUIZ_PASSED} pts cada</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Sparkles className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{userPoints?.perfect_scores || 0}</p>
                <p className="text-sm text-gray-600">Notas 100%</p>
                <p className="text-xs text-green-600 mt-1">+{POINTS.QUIZ_PERFECT} pts cada</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <GraduationCap className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{userPoints?.courses_completed || 0}</p>
                <p className="text-sm text-gray-600">Cursos Concluídos</p>
                <p className="text-xs text-green-600 mt-1">+{POINTS.COURSE_COMPLETED} pts cada</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Award className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{userPoints?.certificates_earned || 0}</p>
                <p className="text-sm text-gray-600">Certificados</p>
                <p className="text-xs text-green-600 mt-1">+{POINTS.CERTIFICATE_EARNED} pts cada</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{userPoints?.best_streak || 0}</p>
                <p className="text-sm text-gray-600">Melhor Sequência</p>
                <p className="text-xs text-green-600 mt-1">+{POINTS.STREAK_BONUS} pts/dia</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {allUsersPoints.slice(0, 10).map((points, index) => {
                  const userInfo = getUserInfo(points.user_email);
                  const isCurrentUser = points.user_email === currentUser?.email;
                  
                  return (
                    <div
                      key={points.id}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-amber-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={userInfo.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {getInitials(userInfo.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <p className={`font-medium ${isCurrentUser ? 'text-blue-700' : ''}`}>
                          {userInfo.name}
                          {isCurrentUser && <span className="text-xs ml-2">(Você)</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {points.courses_completed || 0} cursos · {points.videos_watched || 0} vídeos
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-amber-600">{points.total_points || 0}</p>
                        <p className="text-xs text-gray-500">pontos</p>
                      </div>

                      {index < 3 && (
                        <Crown className={`w-5 h-5 ${
                          index === 0 ? 'text-amber-500' :
                          index === 1 ? 'text-gray-400' :
                          'text-amber-700'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}