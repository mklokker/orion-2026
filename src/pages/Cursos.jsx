import React, { useState, useEffect } from "react";
import { Course } from "@/entities/Course";
import { CourseVideo } from "@/entities/CourseVideo";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus,
  GraduationCap,
  Video,
  Edit,
  Trash2,
  Play
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import CourseModal from "../components/cursos/CourseModal";
import CreateCourseModal from "../components/cursos/CreateCourseModal";
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

export default function Cursos() {
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [courseVideos, setCourseVideos] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      const [coursesData, videosData] = await Promise.all([
        Course.list("-created_date"),
        CourseVideo.list("order")
      ]);

      setCourses(coursesData);

      // Agrupar vídeos por curso
      const videosByCourse = {};
      videosData.forEach(video => {
        if (!videosByCourse[video.course_id]) {
          videosByCourse[video.course_id] = [];
        }
        videosByCourse[video.course_id].push(video);
      });

      setCourseVideos(videosByCourse);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cursos.",
        variant: "destructive"
      });
    }
  };

  const handleOpenCourse = (course) => {
    setSelectedCourse(course);
    setShowCourseModal(true);
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setShowCreateModal(true);
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    try {
      // Deletar todos os vídeos do curso
      const videos = courseVideos[courseToDelete.id] || [];
      for (const video of videos) {
        await CourseVideo.delete(video.id);
      }

      // Deletar o curso
      await Course.delete(courseToDelete.id);

      toast({
        title: "Sucesso!",
        description: "Curso excluído com sucesso.",
      });

      setShowDeleteDialog(false);
      setCourseToDelete(null);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir curso:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir curso.",
        variant: "destructive"
      });
    }
  };

  const handleSaveCourse = async (courseData) => {
    try {
      if (editingCourse) {
        await Course.update(editingCourse.id, courseData);
        toast({
          title: "Sucesso!",
          description: "Curso atualizado com sucesso.",
        });
      } else {
        await Course.create(courseData);
        toast({
          title: "Sucesso!",
          description: "Curso criado com sucesso.",
        });
      }

      setShowCreateModal(false);
      setEditingCourse(null);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar curso:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar curso.",
        variant: "destructive"
      });
    }
  };

  const getYoutubeThumbnail = (url) => {
    try {
      const videoId = extractYoutubeId(url);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    } catch (error) {
      console.error("Erro ao extrair thumbnail:", error);
    }
    return null;
  };

  const extractYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent flex items-center gap-3">
              <GraduationCap className="w-10 h-10 text-blue-600" />
              Cursos de Treinamento
            </h1>
            <p className="text-gray-600 mt-2">
              Aprenda com nossos cursos em vídeo
            </p>
          </div>

          {isAdmin && (
            <Button
              onClick={() => {
                setEditingCourse(null);
                setShowCreateModal(true);
              }}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Plus className="w-4 h-4" />
              Novo Curso
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Cursos</p>
                  <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
                </div>
                <GraduationCap className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Vídeos</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Object.values(courseVideos).flat().length}
                  </p>
                </div>
                <Video className="w-10 h-10 text-indigo-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar cursos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Cursos */}
        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Nenhum curso encontrado</p>
              {isAdmin && !searchQuery && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar Primeiro Curso
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(course => {
              const videos = courseVideos[course.id] || [];
              const firstVideoThumbnail = videos.length > 0 ? getYoutubeThumbnail(videos[0].youtube_url) : null;

              return (
                <Card 
                  key={course.id}
                  className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-300 overflow-hidden"
                  onClick={() => handleOpenCourse(course)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
                    {firstVideoThumbnail ? (
                      <img
                        src={firstVideoThumbnail}
                        alt={course.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap className="w-20 h-20 text-white opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="w-16 h-16 text-white" />
                    </div>
                  </div>

                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{course.name}</CardTitle>
                      {isAdmin && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCourse(course);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCourseToDelete(course);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {course.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {course.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Video className="w-3 h-3" />
                        {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedCourse && (
        <CourseModal
          open={showCourseModal}
          onClose={() => {
            setShowCourseModal(false);
            setSelectedCourse(null);
          }}
          course={selectedCourse}
          videos={courseVideos[selectedCourse.id] || []}
          isAdmin={isAdmin}
          onUpdate={loadData}
        />
      )}

      <CreateCourseModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingCourse(null);
        }}
        course={editingCourse}
        onSave={handleSaveCourse}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Curso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o curso "{courseToDelete?.name}"? 
              Todos os vídeos deste curso também serão excluídos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}