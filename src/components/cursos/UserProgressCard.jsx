import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Video, 
  FileQuestion, 
  CheckCircle2, 
  Clock,
  Trophy
} from "lucide-react";

export default function UserProgressCard({ 
  progress, 
  totalVideos, 
  totalQuizzes,
  quizAttempts = []
}) {
  const videosWatched = progress?.videos_watched?.length || 0;
  const quizzesCompleted = progress?.quizzes_completed?.length || 0;
  
  // Calculate overall progress
  const totalItems = totalVideos + totalQuizzes;
  const completedItems = videosWatched + quizzesCompleted;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Get best score from attempts
  const bestScore = quizAttempts.length > 0 
    ? Math.max(...quizAttempts.map(a => a.score))
    : null;

  const passedQuizzes = quizAttempts.filter(a => a.passed).length;

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 bg-blue-100 rounded">
              <Video className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-blue-900">{videosWatched}/{totalVideos}</p>
              <p className="text-xs text-gray-600">Vídeos</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 bg-purple-100 rounded">
              <FileQuestion className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-purple-900">{quizzesCompleted}/{totalQuizzes}</p>
              <p className="text-xs text-gray-600">Provas</p>
            </div>
          </div>

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

          {progress?.status === "completed" && (
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
      </CardContent>
    </Card>
  );
}