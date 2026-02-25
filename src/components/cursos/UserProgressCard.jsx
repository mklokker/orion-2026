import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Video, 
  FileQuestion, 
  CheckCircle2, 
  Trophy,
  Award,
  Loader2
} from "lucide-react";
import { Certificate } from "@/entities/Certificate";
import { User } from "@/entities/User";
import { useToast } from "@/components/ui/use-toast";
import confetti from "canvas-confetti";
import { addPoints } from "./GamificationService";

export default function UserProgressCard({ 
  progress, 
  totalVideos,
  totalDocuments = 0,
  totalQuizzes,
  quizAttempts = [],
  course,
  userEmail,
  existingCertificate,
  onCertificateRequest,
  onViewCertificate
}) {
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  
  const videosWatched = progress?.videos_watched?.length || 0;
  const documentsRead = progress?.documents_read?.length || 0;
  const quizzesCompleted = progress?.quizzes_completed?.length || 0;
  
  // Calculate overall progress
  const totalItems = totalVideos + totalDocuments + totalQuizzes;
  const completedItems = videosWatched + documentsRead + quizzesCompleted;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Check if course is completed
  const allVideosWatched = videosWatched >= totalVideos;
  const allDocumentsRead = documentsRead >= totalDocuments;
  const allQuizzesPassed = totalQuizzes === 0 || quizzesCompleted >= totalQuizzes;
  const hasContent = totalVideos > 0 || totalDocuments > 0;
  const isCourseCompleted = hasContent && allVideosWatched && allDocumentsRead && allQuizzesPassed;

  // Get best score from attempts
  const bestScore = quizAttempts.length > 0 
    ? Math.max(...quizAttempts.map(a => a.score))
    : null;

  const handleRequestCertificate = async () => {
    if (!isCourseCompleted || existingCertificate) return;
    
    setIsRequesting(true);
    try {
      const user = await User.me();
      const userName = user.display_name || user.full_name || userEmail;

      // Generate unique certificate ID
      const year = new Date().getFullYear();
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const certificateId = `CERT-${year}-${randomPart}`;

      // Calculate average score if there are quizzes
      let avgScore = null;
      if (quizAttempts.length > 0) {
        const passedAttempts = quizAttempts.filter(a => a.passed);
        avgScore = passedAttempts.length > 0
          ? Math.round(passedAttempts.reduce((sum, a) => sum + a.score, 0) / passedAttempts.length)
          : null;
      }

      await Certificate.create({
        certificate_id: certificateId,
        user_email: userEmail,
        user_name: userName,
        course_id: course.id,
        course_name: course.name,
        completion_date: new Date().toISOString().split('T')[0],
        issued_at: new Date().toISOString(),
        score: avgScore,
        is_revoked: false
      });

      // Add gamification points
      await addPoints(userEmail, 'COURSE_COMPLETED');
      await addPoints(userEmail, 'CERTIFICATE_EARNED');

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: "🎉 Certificado Emitido!",
        description: "Parabéns! Seu certificado foi gerado com sucesso.",
      });

      onCertificateRequest?.();
    } catch (error) {
      console.error("Erro ao solicitar certificado:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar certificado. Tente novamente.",
        variant: "destructive"
      });
    }
    setIsRequesting(false);
  };

  if (!progress && quizAttempts.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#1a1a1a] dark:to-[#1a1a1a] border-blue-200 dark:border-[#2e2e2e]">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-blue-900 dark:text-white">Seu Progresso</h3>
          <Badge variant="outline" className="bg-white dark:bg-[#2a2a2a] dark:border-[#2e2e2e] dark:text-[#a1a1a1]">
            {progressPercentage}% completo
          </Badge>
        </div>

        <Progress value={progressPercentage} className="h-3 mb-4" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {totalVideos > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-blue-100 dark:bg-[#21498A]/20 rounded">
                <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-blue-900 dark:text-white">{videosWatched}/{totalVideos}</p>
                <p className="text-xs text-gray-600 dark:text-[#6b6b6b]">Vídeos</p>
              </div>
            </div>
          )}

          {totalDocuments > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/20 rounded">
                <FileQuestion className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="font-medium text-indigo-900 dark:text-white">{documentsRead}/{totalDocuments}</p>
                <p className="text-xs text-gray-600 dark:text-[#6b6b6b]">Documentos</p>
              </div>
            </div>
          )}

          {totalQuizzes > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 rounded">
                <FileQuestion className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-purple-900 dark:text-white">{quizzesCompleted}/{totalQuizzes}</p>
                <p className="text-xs text-gray-600 dark:text-[#6b6b6b]">Provas</p>
              </div>
            </div>
          )}

          {bestScore !== null && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-green-100 dark:bg-[#22946E]/20 rounded">
                <Trophy className="w-4 h-4 text-green-600 dark:text-[#22946E]" />
              </div>
              <div>
                <p className="font-medium text-green-900 dark:text-white">{bestScore}%</p>
                <p className="text-xs text-gray-600 dark:text-[#6b6b6b]">Melhor Nota</p>
              </div>
            </div>
          )}

          {isCourseCompleted && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-emerald-100 dark:bg-[#22946E]/20 rounded">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#22946E]" />
              </div>
              <div>
                <p className="font-medium text-emerald-900 dark:text-[#22946E]">Concluído!</p>
                <p className="text-xs text-gray-600 dark:text-[#6b6b6b]">Status</p>
              </div>
            </div>
          )}
        </div>

        {/* Certificate Button */}
        {isCourseCompleted && (
          <div className="border-t border-blue-200 dark:border-[#2e2e2e] pt-4">
            {existingCertificate ? (
              <Button 
                onClick={() => onViewCertificate?.(existingCertificate)}
                className="w-full gap-2 bg-amber-500 hover:bg-amber-600"
              >
                <Award className="w-4 h-4" />
                Ver Meu Certificado
              </Button>
            ) : (
              <Button 
                onClick={handleRequestCertificate}
                disabled={isRequesting}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                {isRequesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Award className="w-4 h-4" />
                )}
                {isRequesting ? "Gerando..." : "Solicitar Certificado"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}