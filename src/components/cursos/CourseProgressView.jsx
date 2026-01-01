import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Trophy, 
  Video, 
  FileQuestion,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award
} from "lucide-react";
import { CourseProgress } from "@/entities/CourseProgress";
import { QuizAttempt } from "@/entities/QuizAttempt";
import { CourseQuiz } from "@/entities/CourseQuiz";
import { CourseVideo } from "@/entities/CourseVideo";
import { User } from "@/entities/User";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CourseProgressView({ open, onClose, course }) {
  const [users, setUsers] = useState([]);
  const [progress, setProgress] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && course) {
      loadData();
    }
  }, [open, course]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, progressData, attemptsData, quizzesData, videosData] = await Promise.all([
        User.list(),
        CourseProgress.filter({ course_id: course.id }),
        QuizAttempt.filter({ course_id: course.id }),
        CourseQuiz.filter({ course_id: course.id }),
        CourseVideo.filter({ course_id: course.id })
      ]);

      setUsers(usersData);
      setProgress(progressData);
      setQuizAttempts(attemptsData);
      setQuizzes(quizzesData);
      setVideos(videosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const getUserDisplayName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.display_name || user?.full_name || email;
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

  // Statistics
  const totalUsers = new Set(progress.map(p => p.user_email)).size;
  const completedUsers = progress.filter(p => p.status === "completed").length;
  const avgProgress = progress.length > 0 
    ? Math.round(progress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / progress.length)
    : 0;
  const totalAttempts = quizAttempts.length;
  const passedAttempts = quizAttempts.filter(a => a.passed).length;
  const avgScore = quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((sum, a) => sum + a.score, 0) / quizAttempts.length)
    : 0;

  // Group attempts by user
  const userAttempts = {};
  quizAttempts.forEach(attempt => {
    if (!userAttempts[attempt.user_email]) {
      userAttempts[attempt.user_email] = [];
    }
    userAttempts[attempt.user_email].push(attempt);
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Progresso do Curso - {course?.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Carregando dados...</div>
        ) : (
          <div className="py-4 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalUsers}</p>
                      <p className="text-xs text-gray-600">Alunos Iniciaram</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Trophy className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{completedUsers}</p>
                      <p className="text-xs text-gray-600">Concluíram</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileQuestion className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{passedAttempts}/{totalAttempts}</p>
                      <p className="text-xs text-gray-600">Provas Aprovadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Award className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{avgScore}%</p>
                      <p className="text-xs text-gray-600">Nota Média</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="progress">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="progress">Progresso por Aluno</TabsTrigger>
                <TabsTrigger value="quizzes">Resultados das Provas</TabsTrigger>
              </TabsList>

              <TabsContent value="progress" className="mt-4">
                {progress.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum aluno iniciou este curso ainda.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Vídeos Assistidos</TableHead>
                        <TableHead>Provas Completadas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Iniciado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {progress.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={getUserAvatar(p.user_email)} />
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                  {getInitials(getUserDisplayName(p.user_email))}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{getUserDisplayName(p.user_email)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4 text-gray-400" />
                              {p.videos_watched?.length || 0}/{videos.length}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileQuestion className="w-4 h-4 text-gray-400" />
                              {p.quizzes_completed?.length || 0}/{quizzes.length}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              p.status === "completed" ? "default" :
                              p.status === "in_progress" ? "secondary" : "outline"
                            } className={
                              p.status === "completed" ? "bg-green-100 text-green-700" : ""
                            }>
                              {p.status === "completed" ? "Concluído" :
                               p.status === "in_progress" ? "Em Progresso" : "Não Iniciado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {p.started_at ? format(new Date(p.started_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="quizzes" className="mt-4">
                {quizAttempts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    Nenhuma prova realizada ainda.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Prova</TableHead>
                        <TableHead>Nota</TableHead>
                        <TableHead>Acertos</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizAttempts
                        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
                        .map(attempt => {
                          const quiz = quizzes.find(q => q.id === attempt.quiz_id);
                          return (
                            <TableRow key={attempt.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={getUserAvatar(attempt.user_email)} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                      {getInitials(getUserDisplayName(attempt.user_email))}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{getUserDisplayName(attempt.user_email)}</span>
                                </div>
                              </TableCell>
                              <TableCell>{quiz?.title || "Prova removida"}</TableCell>
                              <TableCell>
                                <span className={`font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                                  {attempt.score}%
                                </span>
                              </TableCell>
                              <TableCell>{attempt.total_correct}/{attempt.total_questions}</TableCell>
                              <TableCell>
                                {attempt.passed ? (
                                  <Badge className="bg-green-100 text-green-700 gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Aprovado
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="gap-1">
                                    Reprovado
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {attempt.completed_at 
                                  ? format(new Date(attempt.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}