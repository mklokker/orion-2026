import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, Edit, Trash2, GripVertical, Upload, X, FileQuestion, Video, CheckCircle2, Trophy, Clock, FileText, FileSpreadsheet, Presentation, Eye } from "lucide-react";
import { CourseVideo } from "@/entities/CourseVideo";
import { CourseDocument } from "@/entities/CourseDocument";
import { CourseProgress } from "@/entities/CourseProgress";
import { QuizQuestion } from "@/entities/QuizQuestion";
import { Certificate } from "@/entities/Certificate";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import VideoPlayer from "./VideoPlayer";
import QuizManager from "./QuizManager";
import QuizPlayer from "./QuizPlayer";
import UserProgressCard from "./UserProgressCard";
import CertificateViewer from "./CertificateViewer";
import BadgeNotification from "./BadgeNotification";
import DocumentViewer from "./DocumentViewer";
import { addPoints } from "./GamificationService";
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
import {
  Dialog as VideoDialog,
  DialogContent as VideoDialogContent,
  DialogHeader as VideoDialogHeader,
  DialogTitle as VideoDialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function CourseModal({ 
  open, 
  onClose, 
  course, 
  videos, 
  documents = [],
  quizzes = [],
  userProgress,
  userAttempts = [],
  currentUser,
  isAdmin, 
  onUpdate 
}) {
  const { toast } = useToast();
  const [orderedVideos, setOrderedVideos] = useState(videos);
  const [orderedDocuments, setOrderedDocuments] = useState(documents);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCoverImage, setVideoCoverImage] = useState(null);
  const [videoCoverPreview, setVideoCoverPreview] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showQuizManager, setShowQuizManager] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState("videos");
  const [userCertificate, setUserCertificate] = useState(null);
  const [viewingCertificate, setViewingCertificate] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  
  // Document states
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [showDeleteDocDialog, setShowDeleteDocDialog] = useState(false);

  React.useEffect(() => {
    setOrderedVideos(videos);
  }, [videos]);

  React.useEffect(() => {
    setOrderedDocuments(documents);
  }, [documents]);

  // Load user certificate
  React.useEffect(() => {
    const loadCertificate = async () => {
      if (currentUser && course) {
        try {
          const certs = await Certificate.filter({
            user_email: currentUser.email,
            course_id: course.id
          });
          const validCert = certs.find(c => !c.is_revoked);
          setUserCertificate(validCert || null);
        } catch (error) {
          console.error("Erro ao carregar certificado:", error);
        }
      }
    };
    loadCertificate();
  }, [currentUser, course]);

  const loadQuizQuestions = async (quiz) => {
    try {
      const questions = await QuizQuestion.filter({ quiz_id: quiz.id }, "order");
      setQuizQuestions(questions);
      setSelectedQuiz(quiz);
    } catch (error) {
      console.error("Erro ao carregar questões:", error);
      toast({ title: "Erro", description: "Erro ao carregar prova.", variant: "destructive" });
    }
  };

  const handleVideoWatched = async (video) => {
    if (!currentUser) return;
    
    try {
      const existingProgress = await CourseProgress.filter({
        user_email: currentUser.email,
        course_id: course.id
      });

      let isNewVideo = false;

      if (existingProgress.length > 0) {
        const progress = existingProgress[0];
        const videosWatched = progress.videos_watched || [];
        
        if (!videosWatched.includes(video.id)) {
          isNewVideo = true;
          videosWatched.push(video.id);
          
          // Check if course is completed
          const activeQuizzes = quizzes.filter(q => q.is_active !== false);
          const totalItems = videos.length + activeQuizzes.length;
          const completedItems = videosWatched.length + (progress.quizzes_completed?.length || 0);
          const isCompleted = completedItems >= totalItems;

          await CourseProgress.update(progress.id, {
            videos_watched: videosWatched,
            status: isCompleted ? "completed" : "in_progress",
            completed_at: isCompleted ? new Date().toISOString() : null,
            progress_percentage: Math.round((completedItems / totalItems) * 100)
          });
        }
      } else {
        isNewVideo = true;
        const activeQuizzes = quizzes.filter(q => q.is_active !== false);
        await CourseProgress.create({
          user_email: currentUser.email,
          course_id: course.id,
          videos_watched: [video.id],
          quizzes_completed: [],
          progress_percentage: Math.round((1 / (videos.length + activeQuizzes.length)) * 100),
          started_at: new Date().toISOString(),
          status: "in_progress"
        });
      }
      
      // Add gamification points for new video
      if (isNewVideo) {
        const result = await addPoints(currentUser.email, 'VIDEO_WATCHED');
        if (result?.newBadges?.length > 0) {
          setNewBadge(result.newBadges[0]);
        }
      }
      
      onUpdate();
    } catch (error) {
      console.error("Erro ao marcar vídeo como assistido:", error);
    }
  };

  const isVideoWatched = (videoId) => {
    return userProgress?.videos_watched?.includes(videoId);
  };

  const isQuizCompleted = (quizId) => {
    return userProgress?.quizzes_completed?.includes(quizId);
  };

  const getQuizBestScore = (quizId) => {
    const attempts = userAttempts.filter(a => a.quiz_id === quizId);
    if (attempts.length === 0) return null;
    return Math.max(...attempts.map(a => a.score));
  };

  const handleDragEnd = async (result) => {
    if (!result.destination || !isAdmin) return;

    const items = Array.from(orderedVideos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setOrderedVideos(items);

    // Atualizar ordem no banco
    try {
      for (let i = 0; i < items.length; i++) {
        await CourseVideo.update(items[i].id, { order: i });
      }
      onUpdate();
    } catch (error) {
      console.error("Erro ao reordenar vídeos:", error);
      toast({
        title: "Erro",
        description: "Erro ao reordenar vídeos.",
        variant: "destructive"
      });
    }
  };

  const handlePlayVideo = (video) => {
    setPlayingVideo(video);
    setShowPlayer(true);
    // Mark as watched when playing
    handleVideoWatched(video);
  };

  const handleAddVideo = () => {
    setEditingVideo(null);
    setVideoTitle("");
    setVideoUrl("");
    setVideoCoverImage(null);
    setVideoCoverPreview("");
    setShowAddVideo(true);
  };

  const handleEditVideo = (video) => {
    setEditingVideo(video);
    setVideoTitle(video.title);
    setVideoUrl(video.youtube_url);
    setVideoCoverPreview(video.cover_image || "");
    setVideoCoverImage(null);
    setShowAddVideo(true);
  };

  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive"
        });
        return;
      }
      setVideoCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveVideo = async () => {
    if (!videoTitle.trim() || !videoUrl.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingCover(true);

    try {
      let coverImageUrl = editingVideo?.cover_image || "";

      if (videoCoverImage) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: videoCoverImage });
        coverImageUrl = file_url;
      }

      if (editingVideo) {
        await CourseVideo.update(editingVideo.id, {
          title: videoTitle.trim(),
          youtube_url: videoUrl.trim(),
          cover_image: coverImageUrl
        });
        toast({
          title: "Sucesso!",
          description: "Vídeo atualizado com sucesso.",
        });
      } else {
        await CourseVideo.create({
          course_id: course.id,
          title: videoTitle.trim(),
          youtube_url: videoUrl.trim(),
          cover_image: coverImageUrl,
          order: orderedVideos.length
        });
        toast({
          title: "Sucesso!",
          description: "Vídeo adicionado com sucesso.",
        });
      }

      setShowAddVideo(false);
      setVideoTitle("");
      setVideoUrl("");
      setVideoCoverImage(null);
      setVideoCoverPreview("");
      setEditingVideo(null);
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar vídeo:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar vídeo.",
        variant: "destructive"
      });
    }

    setIsUploadingCover(false);
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      await CourseVideo.delete(videoToDelete.id);
      toast({
        title: "Sucesso!",
        description: "Vídeo excluído com sucesso.",
      });
      setShowDeleteDialog(false);
      setVideoToDelete(null);
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir vídeo:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir vídeo.",
        variant: "destructive"
      });
    }
  };

  const getYoutubeThumbnail = (url) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    } catch (error) {
      console.error("Erro ao extrair thumbnail:", error);
    }
    return null;
  };

  // Document functions
  const getFileType = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx'].includes(ext)) return 'excel';
    if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
    return 'pdf';
  };

  const getDocIcon = (type) => {
    switch(type) {
      case 'pdf': return { icon: FileText, color: 'text-red-600 bg-red-100' };
      case 'word': return { icon: FileText, color: 'text-blue-600 bg-blue-100' };
      case 'excel': return { icon: FileSpreadsheet, color: 'text-green-600 bg-green-100' };
      case 'powerpoint': return { icon: Presentation, color: 'text-orange-600 bg-orange-100' };
      default: return { icon: FileText, color: 'text-gray-600 bg-gray-100' };
    }
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      if (!validTypes.includes(file.type)) {
        toast({ title: "Tipo de arquivo não suportado", description: "Use PDF, Word, Excel ou PowerPoint.", variant: "destructive" });
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Máximo 50MB.", variant: "destructive" });
        return;
      }
      setDocumentFile(file);
      if (!documentTitle) setDocumentTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSaveDocument = async () => {
    if (!documentTitle.trim() || !documentFile) {
      toast({ title: "Preencha o título e selecione um arquivo.", variant: "destructive" });
      return;
    }
    setIsUploadingDocument(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: documentFile });
      await CourseDocument.create({
        course_id: course.id,
        title: documentTitle.trim(),
        file_url,
        file_name: documentFile.name,
        file_type: getFileType(documentFile.name),
        file_size: documentFile.size,
        order: orderedDocuments.length
      });
      toast({ title: "Documento adicionado!" });
      setShowAddDocument(false);
      setDocumentTitle("");
      setDocumentFile(null);
      onUpdate();
    } catch (error) {
      toast({ title: "Erro ao enviar documento.", variant: "destructive" });
    }
    setIsUploadingDocument(false);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    try {
      await CourseDocument.delete(documentToDelete.id);
      toast({ title: "Documento excluído!" });
      setShowDeleteDocDialog(false);
      setDocumentToDelete(null);
      onUpdate();
    } catch (error) {
      toast({ title: "Erro ao excluir.", variant: "destructive" });
    }
  };

  const handleMarkDocumentRead = async (doc) => {
    if (!currentUser) return;
    try {
      const existingProgress = await CourseProgress.filter({
        user_email: currentUser.email,
        course_id: course.id
      });

      let isNew = false;
      const activeQuizzes = quizzes.filter(q => q.is_active !== false);
      const totalItems = videos.length + documents.length + activeQuizzes.length;

      if (existingProgress.length > 0) {
        const progress = existingProgress[0];
        const docsRead = progress.documents_read || [];
        if (!docsRead.includes(doc.id)) {
          isNew = true;
          docsRead.push(doc.id);
          const completedItems = (progress.videos_watched?.length || 0) + docsRead.length + (progress.quizzes_completed?.length || 0);
          await CourseProgress.update(progress.id, {
            documents_read: docsRead,
            progress_percentage: Math.round((completedItems / totalItems) * 100)
          });
        }
      } else {
        isNew = true;
        await CourseProgress.create({
          user_email: currentUser.email,
          course_id: course.id,
          videos_watched: [],
          documents_read: [doc.id],
          quizzes_completed: [],
          progress_percentage: Math.round((1 / totalItems) * 100),
          started_at: new Date().toISOString(),
          status: "in_progress"
        });
      }

      if (isNew) {
        const result = await addPoints(currentUser.email, 'VIDEO_WATCHED');
        if (result?.newBadges?.length > 0) setNewBadge(result.newBadges[0]);
      }
      onUpdate();
    } catch (error) {
      console.error("Erro ao marcar documento:", error);
    }
  };

  const isDocumentRead = (docId) => userProgress?.documents_read?.includes(docId);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">{course.name}</DialogTitle>
                {course.description && (
                  <p className="text-sm text-gray-600">{course.description}</p>
                )}
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="gap-1">
                    <Video className="w-3 h-3" />
                    {orderedVideos.length} {orderedVideos.length === 1 ? 'vídeo' : 'vídeos'}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <FileText className="w-3 h-3" />
                    {orderedDocuments.length} {orderedDocuments.length === 1 ? 'documento' : 'documentos'}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <FileQuestion className="w-3 h-3" />
                    {quizzes.length} {quizzes.length === 1 ? 'prova' : 'provas'}
                  </Badge>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setShowQuizManager(true)} className="gap-2">
                    <FileQuestion className="w-4 h-4" />
                    Provas
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddDocument(true)} className="gap-2">
                    <FileText className="w-4 h-4" />
                    Documento
                  </Button>
                  <Button onClick={handleAddVideo} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Vídeo
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* User Progress Card */}
          {currentUser && (
            <UserProgressCard
              progress={userProgress}
              totalVideos={videos.length}
              totalQuizzes={quizzes.filter(q => q.is_active !== false).length}
              quizAttempts={userAttempts}
              course={course}
              userEmail={currentUser.email}
              existingCertificate={userCertificate}
              onCertificateRequest={() => {
                onUpdate();
                // Reload certificate
                Certificate.filter({
                  user_email: currentUser.email,
                  course_id: course.id
                }).then(certs => {
                  const validCert = certs.find(c => !c.is_revoked);
                  setUserCertificate(validCert || null);
                  if (validCert) setViewingCertificate(validCert);
                });
              }}
              onViewCertificate={(cert) => setViewingCertificate(cert)}
            />
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="videos" className="gap-2">
                <Video className="w-4 h-4" />
                Vídeos ({orderedVideos.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="w-4 h-4" />
                Documentos ({orderedDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="gap-2">
                <FileQuestion className="w-4 h-4" />
                Provas ({quizzes.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="py-4">
              {orderedVideos.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhum vídeo adicionado ainda.</p>
                  {isAdmin && (
                    <Button onClick={handleAddVideo} className="mt-4 gap-2">
                      <Plus className="w-4 h-4" />
                      Adicionar Primeiro Vídeo
                    </Button>
                  )}
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="videos">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {orderedVideos.map((video, index) => (
                          <Draggable
                            key={video.id}
                            draggableId={video.id}
                            index={index}
                            isDragDisabled={!isAdmin}
                          >
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`border-2 ${snapshot.isDragging ? 'border-blue-400 shadow-lg' : ''} ${isVideoWatched(video.id) ? 'border-green-200 bg-green-50/50' : ''}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    {isAdmin && (
                                      <div {...provided.dragHandleProps}>
                                        <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                                      </div>
                                    )}

                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                      isVideoWatched(video.id) 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {isVideoWatched(video.id) ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                      ) : (
                                        index + 1
                                      )}
                                    </div>

                                    <img
                                      src={video.cover_image || getYoutubeThumbnail(video.youtube_url)}
                                      alt={video.title}
                                      className="w-24 h-16 object-cover rounded"
                                    />

                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold truncate">{video.title}</h4>
                                      {isVideoWatched(video.id) && (
                                        <span className="text-xs text-green-600">Assistido</span>
                                      )}
                                    </div>

                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handlePlayVideo(video)}
                                        className="gap-2"
                                      >
                                        <Play className="w-4 h-4" />
                                        Assistir
                                      </Button>

                                      {isAdmin && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditVideo(video)}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600"
                                            onClick={() => {
                                              setVideoToDelete(video);
                                              setShowDeleteDialog(true);
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </TabsContent>

            <TabsContent value="documents" className="py-4">
              {orderedDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum documento adicionado ainda.</p>
                  {isAdmin && (
                    <Button onClick={() => setShowAddDocument(true)} className="mt-4 gap-2">
                      <Plus className="w-4 h-4" />
                      Adicionar Documento
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {orderedDocuments.map((doc, index) => {
                    const { icon: DocIcon, color } = getDocIcon(doc.file_type);
                    const read = isDocumentRead(doc.id);
                    return (
                      <Card key={doc.id} className={`border-2 ${read ? 'border-green-200 bg-green-50/50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${read ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {read ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                            </div>
                            <div className={`p-2 rounded-lg ${color}`}>
                              <DocIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{doc.title}</h4>
                              <p className="text-xs text-gray-500">{doc.file_name}</p>
                              {read && <span className="text-xs text-green-600">Visualizado</span>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => { setViewingDocument(doc); handleMarkDocumentRead(doc); }} className="gap-2">
                                <Eye className="w-4 h-4" />
                                Visualizar
                              </Button>
                              {isAdmin && (
                                <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setDocumentToDelete(doc); setShowDeleteDocDialog(true); }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="quizzes" className="py-4">
              {quizzes.length === 0 ? (
                <div className="text-center py-12">
                  <FileQuestion className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma prova disponível.</p>
                  {isAdmin && (
                    <Button onClick={() => setShowQuizManager(true)} className="mt-4 gap-2">
                      <Plus className="w-4 h-4" />
                      Criar Primeira Prova
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {quizzes.filter(q => q.is_active !== false).map((quiz, index) => {
                    const completed = isQuizCompleted(quiz.id);
                    const bestScore = getQuizBestScore(quiz.id);
                    
                    return (
                      <Card key={quiz.id} className={`border-2 ${completed ? 'border-green-200 bg-green-50/50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                                completed 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {completed ? (
                                  <Trophy className="w-5 h-5" />
                                ) : (
                                  <FileQuestion className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-semibold">{quiz.title}</h4>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                  <span>Nota mínima: {quiz.passing_score}%</span>
                                  {quiz.time_limit_minutes && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {quiz.time_limit_minutes} min
                                    </span>
                                  )}
                                  {bestScore !== null && (
                                    <Badge variant={bestScore >= quiz.passing_score ? "default" : "secondary"} className={bestScore >= quiz.passing_score ? "bg-green-100 text-green-700" : ""}>
                                      Melhor nota: {bestScore}%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() => loadQuizQuestions(quiz)}
                              className="gap-2"
                              variant={completed ? "outline" : "default"}
                            >
                              <Play className="w-4 h-4" />
                              {completed ? "Refazer" : "Iniciar"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Player Modal */}
      {playingVideo && (
        <VideoPlayer
          open={showPlayer}
          onClose={() => {
            setShowPlayer(false);
            setPlayingVideo(null);
          }}
          video={playingVideo}
        />
      )}

      {/* Add/Edit Video Modal */}
      <VideoDialog open={showAddVideo} onOpenChange={setShowAddVideo}>
        <VideoDialogContent>
          <VideoDialogHeader>
            <VideoDialogTitle>
              {editingVideo ? "Editar Vídeo" : "Adicionar Vídeo"}
            </VideoDialogTitle>
          </VideoDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="video-title">Título do Vídeo *</Label>
              <Input
                id="video-title"
                placeholder="Ex: Introdução ao sistema"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-url">Link do YouTube *</Label>
              <Input
                id="video-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Cole o link completo do vídeo do YouTube
              </p>
            </div>

            <div className="space-y-2">
              <Label>Capa do Vídeo (Opcional)</Label>
              {videoCoverPreview ? (
                <div className="relative">
                  <img
                    src={videoCoverPreview}
                    alt="Capa"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setVideoCoverImage(null);
                      setVideoCoverPreview("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="video-cover-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                  />
                  <label htmlFor="video-cover-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-600">Clique para adicionar capa personalizada</p>
                    <p className="text-xs text-gray-500 mt-1">Se não adicionar, usará a thumbnail do YouTube</p>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAddVideo(false)} disabled={isUploadingCover}>
              Cancelar
            </Button>
            <Button onClick={handleSaveVideo} disabled={isUploadingCover}>
              {isUploadingCover ? "Enviando..." : editingVideo ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </VideoDialogContent>
      </VideoDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Vídeo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o vídeo "{videoToDelete?.title}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVideo}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quiz Manager (Admin) */}
      {isAdmin && (
        <QuizManager
          open={showQuizManager}
          onClose={() => setShowQuizManager(false)}
          course={course}
          onUpdate={onUpdate}
        />
      )}

      {/* Quiz Player */}
      {selectedQuiz && quizQuestions.length > 0 && (
        <QuizPlayer
          open={!!selectedQuiz}
          onClose={() => {
            setSelectedQuiz(null);
            setQuizQuestions([]);
          }}
          quiz={selectedQuiz}
          questions={quizQuestions}
          course={course}
          userEmail={currentUser?.email}
          onComplete={onUpdate}
        />
      )}

      {/* Certificate Viewer */}
      <CertificateViewer
        open={!!viewingCertificate}
        onClose={() => setViewingCertificate(null)}
        certificate={viewingCertificate}
      />

      {/* Badge Notification */}
      <BadgeNotification
        badge={newBadge}
        onClose={() => setNewBadge(null)}
      />

      {/* Add Document Modal */}
      <VideoDialog open={showAddDocument} onOpenChange={setShowAddDocument}>
        <VideoDialogContent>
          <VideoDialogHeader>
            <VideoDialogTitle>Adicionar Documento</VideoDialogTitle>
          </VideoDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título do Documento *</Label>
              <Input placeholder="Ex: Manual de Procedimentos" value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input type="file" id="doc-upload" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleDocumentFileChange} />
                <label htmlFor="doc-upload" className="cursor-pointer">
                  {documentFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <span className="text-sm">{documentFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Clique para selecionar</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel ou PowerPoint (max 50MB)</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setShowAddDocument(false); setDocumentTitle(""); setDocumentFile(null); }} disabled={isUploadingDocument}>Cancelar</Button>
            <Button onClick={handleSaveDocument} disabled={isUploadingDocument}>{isUploadingDocument ? "Enviando..." : "Adicionar"}</Button>
          </div>
        </VideoDialogContent>
      </VideoDialog>

      {/* Delete Document Dialog */}
      <AlertDialog open={showDeleteDocDialog} onOpenChange={setShowDeleteDocDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Documento</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir "{documentToDelete?.title}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Viewer */}
      <DocumentViewer open={!!viewingDocument} onClose={() => setViewingDocument(null)} document={viewingDocument} />
    </>
  );
}