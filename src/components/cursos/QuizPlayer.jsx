import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trophy,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Send
} from "lucide-react";
import { QuizAttempt } from "@/entities/QuizAttempt";
import { CourseProgress } from "@/entities/CourseProgress";
import { useToast } from "@/components/ui/use-toast";
import confetti from "canvas-confetti";
import { addPoints } from "./GamificationService";
import BadgeNotification from "./BadgeNotification";

export default function QuizPlayer({ 
  open, 
  onClose, 
  quiz, 
  questions, 
  course,
  userEmail,
  onComplete 
}) {
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [startTime] = useState(new Date());
  const timerRef = useRef(null);
  const [newBadge, setNewBadge] = useState(null);

  useEffect(() => {
    if (open && quiz.time_limit_minutes) {
      setTimeRemaining(quiz.time_limit_minutes * 60);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, quiz]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (questionId, optionIndex) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async (timeUp = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const endTime = new Date();
      const timeSpent = Math.floor((endTime - startTime) / 1000);
      
      // Calculate results
      let totalCorrect = 0;
      const answersArray = questions.map(q => {
        const selectedOption = answers[q.id];
        const isCorrect = selectedOption !== undefined && 
          q.options[selectedOption]?.is_correct === true;
        if (isCorrect) totalCorrect++;
        
        return {
          question_id: q.id,
          selected_option: selectedOption ?? -1,
          is_correct: isCorrect
        };
      });

      const score = Math.round((totalCorrect / questions.length) * 100);
      const passed = score >= quiz.passing_score;

      // Save attempt
      await QuizAttempt.create({
        quiz_id: quiz.id,
        user_email: userEmail,
        course_id: course.id,
        answers: answersArray,
        score,
        total_correct: totalCorrect,
        total_questions: questions.length,
        passed,
        started_at: startTime.toISOString(),
        completed_at: endTime.toISOString(),
        time_spent_seconds: timeSpent
      });

      // Update course progress
      await updateCourseProgress(passed, score);

      // Add gamification points
      let pointsResult = await addPoints(userEmail, 'QUIZ_COMPLETED');
      if (passed) {
        pointsResult = await addPoints(userEmail, 'QUIZ_PASSED');
        if (score === 100) {
          pointsResult = await addPoints(userEmail, 'QUIZ_PERFECT');
        }
      }
      
      if (pointsResult?.newBadges?.length > 0) {
        setNewBadge(pointsResult.newBadges[0]);
      }

      setResult({
        score,
        totalCorrect,
        totalQuestions: questions.length,
        passed,
        timeSpent,
        timeUp,
        answersArray
      });

      if (passed) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onComplete?.();
    } catch (error) {
      console.error("Erro ao enviar prova:", error);
      toast({ title: "Erro", description: "Erro ao enviar prova.", variant: "destructive" });
    }

    setIsSubmitting(false);
  };

  const updateCourseProgress = async (passed, score) => {
    try {
      const existingProgress = await CourseProgress.filter({ 
        user_email: userEmail, 
        course_id: course.id 
      });

      let quizzesCompleted = [];

      if (existingProgress.length > 0) {
        const progress = existingProgress[0];
        quizzesCompleted = progress.quizzes_completed || [];
        
        if (passed && !quizzesCompleted.includes(quiz.id)) {
          quizzesCompleted.push(quiz.id);
        }

        await CourseProgress.update(progress.id, {
          quizzes_completed: quizzesCompleted,
          status: "in_progress"
        });
      } else {
        await CourseProgress.create({
          user_email: userEmail,
          course_id: course.id,
          videos_watched: [],
          quizzes_completed: passed ? [quiz.id] : [],
          progress_percentage: 0,
          started_at: new Date().toISOString(),
          status: "in_progress"
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar progresso:", error);
    }
  };

  const handleClose = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setTimeRemaining(null);
    setResult(null);
    onClose();
  };

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              Resultado da Prova
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 text-center space-y-6">
            {result.passed ? (
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <Trophy className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-600">Parabéns! Você passou!</h2>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-red-600">
                  {result.timeUp ? "Tempo esgotado!" : "Não foi dessa vez"}
                </h2>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-blue-600">{result.score}%</p>
                  <p className="text-sm text-gray-600 mt-1">Nota Final</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-green-600">
                    {result.totalCorrect}/{result.totalQuestions}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Acertos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-purple-600">
                    {Math.floor(result.timeSpent / 60)}:{(result.timeSpent % 60).toString().padStart(2, '0')}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Tempo</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3 text-left max-h-60 overflow-y-auto">
              <h3 className="font-semibold">Revisão das Respostas:</h3>
              {questions.map((q, index) => {
                const answer = result.answersArray.find(a => a.question_id === q.id);
                return (
                  <div key={q.id} className={`p-3 rounded-lg border ${answer?.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-start gap-2">
                      {answer?.is_correct ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{index + 1}. {q.question_text}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Sua resposta: {answer?.selected_option >= 0 ? q.options[answer.selected_option]?.text : "Não respondida"}
                        </p>
                        {!answer?.is_correct && (
                          <p className="text-xs text-green-600 mt-1">
                            Resposta correta: {q.options.find(o => o.is_correct)?.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button onClick={handleClose} className="w-full">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{quiz.title}</DialogTitle>
            {timeRemaining !== null && (
              <Badge variant={timeRemaining < 60 ? "destructive" : "secondary"} className="gap-1 text-lg px-3 py-1">
                <Clock className="w-4 h-4" />
                {formatTime(timeRemaining)}
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Questão {currentQuestion + 1} de {questions.length}</span>
              <span>{answeredCount} respondida(s)</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="py-6">
          <Card className="border-2">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-6">
                <span className="text-blue-600 mr-2">{currentQuestion + 1}.</span>
                {currentQ?.question_text}
              </h3>

              <div className="space-y-3">
                {currentQ?.options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectAnswer(currentQ.id, index)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      answers[currentQ.id] === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        answers[currentQ.id] === index
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQ.id] === index && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <span>{option.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  currentQuestion === index
                    ? 'bg-blue-600 text-white'
                    : answers[questions[index].id] !== undefined
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
              className="gap-2"
            >
              Próxima
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || answeredCount < questions.length}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? "Enviando..." : "Finalizar Prova"}
            </Button>
          )}
        </div>

        {answeredCount < questions.length && currentQuestion === questions.length - 1 && (
          <p className="text-center text-sm text-amber-600">
            Responda todas as questões para enviar a prova
          </p>
        )}
      </DialogContent>

      {/* Badge Notification */}
      <BadgeNotification
        badge={newBadge}
        onClose={() => setNewBadge(null)}
      />
    </Dialog>
  );
}