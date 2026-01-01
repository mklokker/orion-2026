import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Trash2, 
  Edit, 
  FileQuestion, 
  GripVertical,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { CourseQuiz } from "@/entities/CourseQuiz";
import { QuizQuestion } from "@/entities/QuizQuestion";
import { useToast } from "@/components/ui/use-toast";
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

export default function QuizManager({ open, onClose, course, onUpdate }) {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState({});
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  
  // Quiz form state
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && course) {
      loadQuizzes();
    }
  }, [open, course]);

  const loadQuizzes = async () => {
    try {
      const quizzesData = await CourseQuiz.filter({ course_id: course.id }, "order");
      setQuizzes(quizzesData);

      // Load questions for each quiz
      const questionsMap = {};
      for (const quiz of quizzesData) {
        const questionsData = await QuizQuestion.filter({ quiz_id: quiz.id }, "order");
        questionsMap[quiz.id] = questionsData;
      }
      setQuestions(questionsMap);
    } catch (error) {
      console.error("Erro ao carregar provas:", error);
    }
  };

  const handleCreateQuiz = () => {
    setEditingQuiz(null);
    setQuizTitle("");
    setQuizDescription("");
    setPassingScore(70);
    setTimeLimit("");
    setIsActive(true);
    setShowQuizForm(true);
  };

  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz);
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description || "");
    setPassingScore(quiz.passing_score || 70);
    setTimeLimit(quiz.time_limit_minutes?.toString() || "");
    setIsActive(quiz.is_active !== false);
    setShowQuizForm(true);
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      toast({ title: "Erro", description: "Digite o título da prova.", variant: "destructive" });
      return;
    }

    try {
      const quizData = {
        course_id: course.id,
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        passing_score: passingScore,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
        is_active: isActive,
        order: editingQuiz ? editingQuiz.order : quizzes.length
      };

      if (editingQuiz) {
        await CourseQuiz.update(editingQuiz.id, quizData);
        toast({ title: "Sucesso!", description: "Prova atualizada." });
      } else {
        await CourseQuiz.create(quizData);
        toast({ title: "Sucesso!", description: "Prova criada." });
      }

      setShowQuizForm(false);
      loadQuizzes();
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao salvar prova:", error);
      toast({ title: "Erro", description: "Erro ao salvar prova.", variant: "destructive" });
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;

    try {
      // Delete all questions first
      const quizQuestions = questions[quizToDelete.id] || [];
      for (const q of quizQuestions) {
        await QuizQuestion.delete(q.id);
      }
      
      await CourseQuiz.delete(quizToDelete.id);
      toast({ title: "Sucesso!", description: "Prova excluída." });
      
      setShowDeleteDialog(false);
      setQuizToDelete(null);
      loadQuizzes();
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao excluir prova:", error);
      toast({ title: "Erro", description: "Erro ao excluir prova.", variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl flex items-center gap-2">
                <FileQuestion className="w-5 h-5" />
                Gerenciar Provas - {course?.name}
              </DialogTitle>
              <Button onClick={handleCreateQuiz} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Prova
              </Button>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {quizzes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileQuestion className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nenhuma prova criada para este curso.</p>
                <Button onClick={handleCreateQuiz} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Criar Primeira Prova
                </Button>
              </div>
            ) : (
              quizzes.map((quiz) => (
                <Card key={quiz.id} className="border-2 hover:border-blue-300 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {quiz.title}
                          {!quiz.is_active && (
                            <Badge variant="secondary" className="text-xs">Inativa</Badge>
                          )}
                        </CardTitle>
                        {quiz.description && (
                          <p className="text-sm text-gray-600 mt-1">{quiz.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedQuiz(quiz)}
                        >
                          <FileQuestion className="w-4 h-4 mr-1" />
                          Questões ({questions[quiz.id]?.length || 0})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditQuiz(quiz)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => {
                            setQuizToDelete(quiz);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Nota mínima: <strong>{quiz.passing_score}%</strong></span>
                      {quiz.time_limit_minutes && (
                        <span>Tempo: <strong>{quiz.time_limit_minutes} min</strong></span>
                      )}
                      <span>Questões: <strong>{questions[quiz.id]?.length || 0}</strong></span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Form Dialog */}
      <Dialog open={showQuizForm} onOpenChange={setShowQuizForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQuiz ? "Editar Prova" : "Nova Prova"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título da Prova *</Label>
              <Input
                placeholder="Ex: Avaliação Final"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Instruções ou descrição da prova..."
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nota Mínima (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tempo Limite (minutos)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Sem limite"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Prova ativa</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowQuizForm(false)}>Cancelar</Button>
            <Button onClick={handleSaveQuiz}>{editingQuiz ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Manager Dialog */}
      {selectedQuiz && (
        <QuestionManager
          open={!!selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
          quiz={selectedQuiz}
          questions={questions[selectedQuiz.id] || []}
          onUpdate={loadQuizzes}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Prova</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a prova "{quizToDelete?.title}"?
              Todas as questões serão excluídas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuiz} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Question Manager Component
function QuestionManager({ open, onClose, quiz, questions, onUpdate }) {
  const { toast } = useToast();
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState([
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false }
  ]);

  const handleCreateQuestion = () => {
    setEditingQuestion(null);
    setQuestionText("");
    setOptions([
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false }
    ]);
    setShowQuestionForm(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionText(question.question_text);
    setOptions(question.options?.length > 0 ? question.options : [
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false }
    ]);
    setShowQuestionForm(true);
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...options];
    if (field === "is_correct") {
      // Only one correct answer
      newOptions.forEach((opt, i) => {
        opt.is_correct = i === index ? value : false;
      });
    } else {
      newOptions[index][field] = value;
    }
    setOptions(newOptions);
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      toast({ title: "Erro", description: "Digite a pergunta.", variant: "destructive" });
      return;
    }

    const validOptions = options.filter(o => o.text.trim());
    if (validOptions.length < 2) {
      toast({ title: "Erro", description: "Adicione pelo menos 2 opções.", variant: "destructive" });
      return;
    }

    if (!validOptions.some(o => o.is_correct)) {
      toast({ title: "Erro", description: "Selecione a resposta correta.", variant: "destructive" });
      return;
    }

    try {
      const questionData = {
        quiz_id: quiz.id,
        question_text: questionText.trim(),
        question_type: "multiple_choice",
        options: validOptions,
        points: 1,
        order: editingQuestion ? editingQuestion.order : questions.length
      };

      if (editingQuestion) {
        await QuizQuestion.update(editingQuestion.id, questionData);
        toast({ title: "Sucesso!", description: "Questão atualizada." });
      } else {
        await QuizQuestion.create(questionData);
        toast({ title: "Sucesso!", description: "Questão criada." });
      }

      setShowQuestionForm(false);
      onUpdate();
    } catch (error) {
      console.error("Erro ao salvar questão:", error);
      toast({ title: "Erro", description: "Erro ao salvar questão.", variant: "destructive" });
    }
  };

  const handleDeleteQuestion = async (question) => {
    try {
      await QuizQuestion.delete(question.id);
      toast({ title: "Sucesso!", description: "Questão excluída." });
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir questão:", error);
      toast({ title: "Erro", description: "Erro ao excluir questão.", variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Questões - {quiz.title}</DialogTitle>
              <Button onClick={handleCreateQuestion} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Questão
              </Button>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Nenhuma questão criada.</p>
                <Button onClick={handleCreateQuestion} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Criar Primeira Questão
                </Button>
              </div>
            ) : (
              questions.map((question, index) => (
                <Card key={question.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">
                          <span className="text-blue-600 mr-2">{index + 1}.</span>
                          {question.question_text}
                        </p>
                        <div className="mt-2 space-y-1">
                          {question.options?.map((opt, i) => (
                            <div key={i} className={`flex items-center gap-2 text-sm ${opt.is_correct ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                              {opt.is_correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4 opacity-30" />}
                              {opt.text}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditQuestion(question)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDeleteQuestion(question)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Form Dialog */}
      <Dialog open={showQuestionForm} onOpenChange={setShowQuestionForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Editar Questão" : "Nova Questão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pergunta *</Label>
              <Textarea
                placeholder="Digite a pergunta..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <Label>Opções de Resposta (marque a correta)</Label>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOptionChange(index, "is_correct", true)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      option.is_correct 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {option.is_correct && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <Input
                    placeholder={`Opção ${index + 1}`}
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, "text", e.target.value)}
                    className="flex-1"
                  />
                </div>
              ))}
              <p className="text-xs text-gray-500">Clique no círculo para marcar a resposta correta</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowQuestionForm(false)}>Cancelar</Button>
            <Button onClick={handleSaveQuestion}>{editingQuestion ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}