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

export default function UserProgressCard({ 
  progress, 
  totalVideos, 
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
  const quizzesCompleted = progress?.quizzes_completed?.length || 0;
  
  // Calculate overall progress - only count quizzes if there are any
  const totalItems = totalVideos + totalQuizzes;
  const completedVideos = videosWatched;
  const completedQuizzesCount = quizzesCompleted;
  const completedItems = completedVideos + completedQuizzesCount;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Check if course is completed
  // Course is complete when: all videos watched AND (no quizzes OR all quizzes passed)
  const allVideosWatched = videosWatched >= totalVideos && totalVideos > 0;
  const allQuizzesPassed = totalQuizzes === 0 || quizzesCompleted >= totalQuizzes;
  const isCourseCompleted = allVideosWatched && allQuizzesPassed;

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
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-blue-900">Seu Progresso</h3>
          <Badge variant="outline" className="bg-white">
            {progressPercentage}% completo
          </Badge>
        </div>

        <Progress value={progressPercentage} className="h-3 mb-4" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 bg-blue-100 rounded">
              <Video className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-blue-900">{videosWatched}/{totalVideos}</p>
              <p className="text-xs text-gray-600">Vídeos</p>
            </div>
          </div>

          {totalQuizzes > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-purple-100 rounded">
                <FileQuestion className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-purple-900">{quizzesCompleted}/{totalQuizzes}</p>
                <p className="text-xs text-gray-600">Provas</p>
              </div>
            </div>
          )}

          {bestScore !== null && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-green-100 rounded">
                <Trophy className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">{bestScore}%</p>
                <p className="text-xs text-gray-600">Melhor Nota</p>
              </div>
            </div>
          )}

          {isCourseCompleted && (
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 bg-emerald-100 rounded">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-emerald-900">Concluído!</p>
                <p className="text-xs text-gray-600">Status</p>
              </div>
            </div>
          )}
        </div>

        {/* Certificate Button */}
        {isCourseCompleted && (
          <div className="border-t border-blue-200 pt-4">
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