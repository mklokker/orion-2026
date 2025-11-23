import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Play, Edit, Trash2, GripVertical, Upload, X } from "lucide-react";
import { CourseVideo } from "@/entities/CourseVideo";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import VideoPlayer from "./VideoPlayer";
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

export default function CourseModal({ open, onClose, course, videos, isAdmin, onUpdate }) {
  const { toast } = useToast();
  const [orderedVideos, setOrderedVideos] = useState(videos);
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

  React.useEffect(() => {
    setOrderedVideos(videos);
  }, [videos]);

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
                <Badge variant="outline" className="mt-2">
                  {orderedVideos.length} {orderedVideos.length === 1 ? 'vídeo' : 'vídeos'}
                </Badge>
              </div>
              {isAdmin && (
                <Button onClick={handleAddVideo} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Vídeo
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="py-4">
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
                              className={`border-2 ${snapshot.isDragging ? 'border-blue-400 shadow-lg' : ''}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  {isAdmin && (
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                                    </div>
                                  )}

                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                                    {index + 1}
                                  </div>

                                  <img
                                    src={video.cover_image || getYoutubeThumbnail(video.youtube_url)}
                                    alt={video.title}
                                    className="w-24 h-16 object-cover rounded"
                                  />

                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold truncate">{video.title}</h4>
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
          </div>
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
    </>
  );
}