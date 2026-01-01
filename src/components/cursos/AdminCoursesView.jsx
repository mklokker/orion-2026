import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Trophy,
  Search,
  Award,
  TrendingUp,
  GraduationCap,
  Video,
  FileQuestion,
  CheckCircle2,
  Clock,
  Eye
} from "lucide-react";
import { CourseProgress } from "@/entities/CourseProgress";
import { QuizAttempt } from "@/entities/QuizAttempt";
import { Certificate } from "@/entities/Certificate";
import { Course } from "@/entities/Course";
import { CourseVideo } from "@/entities/CourseVideo";
import { CourseQuiz } from "@/entities/CourseQuiz";
import { User } from "@/entities/User";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import CourseProgressView from "./CourseProgressView";
import CertificatesManager from "./CertificatesManager";
import CertificateViewer from "./CertificateViewer";

export default function AdminCoursesView() {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allProgress, setAllProgress] = useState([]);
  const [allAttempts, setAllAttempts] = useState([]);
  const [allCertificates, setAllCertificates] = useState([]);
  const [courseVideos, setCourseVideos] = useState({});
  const [courseQuizzes, setCourseQuizzes] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCertificatesManager, setShowCertificatesManager] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, coursesData, progressData, attemptsData, certsData, videosData, quizzesData] = await Promise.all([
        User.list(),
        Course.list("-created_date"),
        CourseProgress.list(),
        QuizAttempt.list("-completed_at"),
        Certificate.list("-issued_at"),
        CourseVideo.list("order"),
        CourseQuiz.list("order")
      ]);

      setUsers(usersData);
      setCourses(coursesData);
      setAllProgress(progressData);
      setAllAttempts(attemptsData);
      setAllCertificates(certsData);

      // Group videos by course
      const videosByCourse = {};
      videosData.forEach(v => {
        if (!videosByCourse[v.course_id]) videosByCourse[v.course_id] = [];
        videosByCourse[v.course_id].push(v);
      });
      setCourseVideos(videosByCourse);

      // Group quizzes by course
      const quizzesByCourse = {};
      quizzesData.forEach(q => {
        if (!quizzesByCourse[q.course_id]) quizzesByCourse[q.course_id] = [];
        quizzesByCourse[q.course_id].push(q);
      });
      setCourseQuizzes(quizzesByCourse);

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

  const getCourseName = (courseId) => {
    return courses.find(c => c.id === courseId)?.name || "Curso removido";
  };

  // Stats
  const totalEnrollments = allProgress.length;
  const completedCourses = allProgress.filter(p => p.status === "completed").length;
  const totalCertificates = allCertificates.filter(c => !c.is_revoked).length;
  const avgCompletionRate = totalEnrollments > 0 
    ? Math.round((completedCourses / totalEnrollments) * 100) 
    : 0;

  // User progress summary
  const userProgressSummary = users.map(user => {
    const userProg = allProgress.filter(p => p.user_email === user.email);
    const userCerts = allCertificates.filter(c => c.user_email === user.email && !c.is_revoked);
    const userAttempts = allAttempts.filter(a => a.user_email === user.email);
    const completedCount = userProg.filter(p => p.status === "completed").length;
    const inProgressCount = userProg.filter(p => p.status === "in_progress").length;
    const avgScore = userAttempts.length > 0
      ? Math.round(userAttempts.reduce((sum, a) => sum + a.score, 0) / userAttempts.length)
      : null;

    return {
      ...user,
      coursesStarted: userProg.length,
      coursesCompleted: completedCount,
      coursesInProgress: inProgressCount,
      certificatesCount: userCerts.length,
      avgScore,
      latestActivity: userProg.length > 0 
        ? userProg.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))[0].updated_date
        : null
    };
  }).filter(u => u.coursesStarted > 0 || searchQuery);

  const filteredUsers = userProgressSummary.filter(user =>
    getUserDisplayName(user.email).toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEnrollments}</p>
                <p className="text-xs text-gray-600">Inscrições</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCourses}</p>
                <p className="text-xs text-gray-600">Conclusões</p>
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
                <p className="text-2xl font-bold">{totalCertificates}</p>
                <p className="text-xs text-gray-600">Certificados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgCompletionRate}%</p>
                <p className="text-xs text-gray-600">Taxa Conclusão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Por Usuário
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Por Curso
          </TabsTrigger>
          <TabsTrigger value="certificates" className="gap-2">
            <Award className="w-4 h-4" />
            Certificados
          </TabsTrigger>
        </TabsList>

        {/* By User Tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar usuário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhum usuário iniciou cursos ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-center">Iniciados</TableHead>
                  <TableHead className="text-center">Em Progresso</TableHead>
                  <TableHead className="text-center">Concluídos</TableHead>
                  <TableHead className="text-center">Certificados</TableHead>
                  <TableHead className="text-center">Nota Média</TableHead>
                  <TableHead>Última Atividade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers
                  .sort((a, b) => b.coursesCompleted - a.coursesCompleted)
                  .map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.profile_picture} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            {getInitials(getUserDisplayName(user.email))}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getUserDisplayName(user.email)}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{user.coursesStarted}</TableCell>
                    <TableCell className="text-center">
                      {user.coursesInProgress > 0 ? (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {user.coursesInProgress}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.coursesCompleted > 0 ? (
                        <Badge className="bg-green-100 text-green-700">
                          {user.coursesCompleted}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.certificatesCount > 0 ? (
                        <Badge className="bg-amber-100 text-amber-700 gap-1">
                          <Award className="w-3 h-3" />
                          {user.certificatesCount}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.avgScore !== null ? (
                        <span className={`font-medium ${user.avgScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                          {user.avgScore}%
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {user.latestActivity 
                        ? format(new Date(user.latestActivity), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* By Course Tab */}
        <TabsContent value="courses" className="mt-4 space-y-4">
          <div className="grid gap-4">
            {courses.map(course => {
              const videos = courseVideos[course.id] || [];
              const quizzes = courseQuizzes[course.id] || [];
              const courseProgress = allProgress.filter(p => p.course_id === course.id);
              const courseCerts = allCertificates.filter(c => c.course_id === course.id && !c.is_revoked);
              const enrolled = courseProgress.length;
              const completed = courseProgress.filter(p => p.status === "completed").length;
              const completionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

              return (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{course.name}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Video className="w-4 h-4" />
                            {videos.length} vídeos
                          </span>
                          <span className="flex items-center gap-1">
                            <FileQuestion className="w-4 h-4" />
                            {quizzes.length} provas
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {enrolled} inscritos
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {completed} concluíram
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            {courseCerts.length} certificados
                          </span>
                        </div>
                        {enrolled > 0 && (
                          <div className="mt-3 flex items-center gap-3">
                            <Progress value={completionRate} className="h-2 flex-1 max-w-xs" />
                            <span className="text-sm font-medium text-gray-700">{completionRate}% taxa de conclusão</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCourse(course)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowCertificatesManager(true)} className="gap-2">
              <Award className="w-4 h-4" />
              Gerenciar Certificados
            </Button>
          </div>

          {allCertificates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Nenhum certificado emitido ainda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>ID Certificado</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Emitido em</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCertificates.slice(0, 20).map(cert => (
                  <TableRow key={cert.id} className={cert.is_revoked ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={getUserAvatar(cert.user_email)} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            {getInitials(cert.user_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{cert.user_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{cert.course_name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{cert.certificate_id}</code>
                    </TableCell>
                    <TableCell>
                      {cert.score ? <span className="font-medium text-green-600">{cert.score}%</span> : "-"}
                    </TableCell>
                    <TableCell>
                      {cert.is_revoked ? (
                        <Badge variant="destructive">Revogado</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {format(new Date(cert.issued_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingCertificate(cert)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Course Progress Modal */}
      {selectedCourse && (
        <CourseProgressView
          open={!!selectedCourse}
          onClose={() => setSelectedCourse(null)}
          course={selectedCourse}
        />
      )}

      {/* Certificates Manager Modal */}
      <CertificatesManager
        open={showCertificatesManager}
        onClose={() => setShowCertificatesManager(false)}
      />

      {/* Certificate Viewer */}
      <CertificateViewer
        open={!!viewingCertificate}
        onClose={() => setViewingCertificate(null)}
        certificate={viewingCertificate}
      />
    </div>
  );
}