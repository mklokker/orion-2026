import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileQuestion,
  Printer,
  ArrowLeft,
  Clock,
  CheckCircle2,
  GraduationCap,
  FileText,
  Settings,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";

const CourseQuiz = base44.entities.CourseQuiz;
const QuizQuestion = base44.entities.QuizQuestion;
const Course = base44.entities.Course;
const AppSettings = base44.entities.AppSettings;

export default function ImprimirProva() {
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [appSettings, setAppSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Seleção
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState("");

  // Opções de impressão
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [studentNameField, setStudentNameField] = useState(true);
  const [dateField, setDateField] = useState(true);
  const [customTitle, setCustomTitle] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");

  // Preview mode
  const [showPreview, setShowPreview] = useState(false);

  const printRef = useRef();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadQuizzes();
    } else {
      setQuizzes([]);
      setSelectedQuiz("");
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedQuiz) {
      loadQuestions();
    } else {
      setQuestions([]);
    }
  }, [selectedQuiz]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesData, settingsData] = await Promise.all([
        Course.list("name"),
        AppSettings.list()
      ]);
      setCourses(coursesData);
      if (settingsData.length > 0) {
        setAppSettings(settingsData[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const loadQuizzes = async () => {
    try {
      const quizzesData = await CourseQuiz.filter({ course_id: selectedCourse }, "order");
      setQuizzes(quizzesData);
    } catch (error) {
      console.error("Erro ao carregar provas:", error);
    }
  };

  const loadQuestions = async () => {
    try {
      const questionsData = await QuizQuestion.filter({ quiz_id: selectedQuiz }, "order");
      setQuestions(questionsData);
    } catch (error) {
      console.error("Erro ao carregar questões:", error);
    }
  };

  const selectedQuizData = quizzes.find(q => q.id === selectedQuiz);
  const selectedCourseData = courses.find(c => c.id === selectedCourse);

  const handlePrint = () => {
    window.print();
  };

  const getLetterOption = (index) => {
    return String.fromCharCode(65 + index); // A, B, C, D...
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Configurações - Oculto na impressão */}
      <div className="print:hidden p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Printer className="w-7 h-7 text-indigo-600" />
              Imprimir Prova
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Configure e imprima provas para aplicação em papel</p>
          </div>
        </div>

        {/* Seleção de Curso e Prova */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileQuestion className="w-5 h-5" />
              Selecionar Prova
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Curso</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prova</Label>
                <Select value={selectedQuiz} onValueChange={setSelectedQuiz} disabled={!selectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCourse ? "Selecione uma prova" : "Selecione um curso primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {quizzes.map(quiz => (
                      <SelectItem key={quiz.id} value={quiz.id}>
                        {quiz.title} ({questions.length || 0} questões)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opções de Impressão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Opções de Impressão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Mostrar cabeçalho com logo</Label>
                  <Switch checked={showHeader} onCheckedChange={setShowHeader} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Campo para nome do aluno</Label>
                  <Switch checked={studentNameField} onCheckedChange={setStudentNameField} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Campo para data</Label>
                  <Switch checked={dateField} onCheckedChange={setDateField} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Mostrar instruções</Label>
                  <Switch checked={showInstructions} onCheckedChange={setShowInstructions} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-green-600 font-medium">Incluir gabarito</Label>
                  <Switch checked={showAnswerKey} onCheckedChange={setShowAnswerKey} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label>Título personalizado (opcional)</Label>
                <Input
                  placeholder="Ex: Avaliação Bimestral - 2024"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Instruções personalizadas (opcional)</Label>
                <Input
                  placeholder="Ex: Leia atentamente cada questão antes de responder..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(!showPreview)}
            disabled={!selectedQuiz || questions.length === 0}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? "Ocultar Preview" : "Ver Preview"}
          </Button>
          <Button 
            onClick={handlePrint}
            disabled={!selectedQuiz || questions.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Prova
          </Button>
        </div>
      </div>

      {/* Preview / Área de Impressão */}
      {(showPreview || selectedQuiz) && questions.length > 0 && (
        <div className={`${showPreview ? 'block' : 'hidden'} print:block`}>
          <div className="print:hidden p-6 max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview da Prova
            </h2>
          </div>
          
          {/* Documento de Impressão */}
          <div 
            ref={printRef}
            className="bg-white print:bg-white mx-auto max-w-4xl print:max-w-none print:mx-0 shadow-lg print:shadow-none"
            style={{ padding: '2cm', minHeight: '29.7cm' }}
          >
            {/* Cabeçalho */}
            {showHeader && (
              <div className="border-b-2 border-gray-800 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {appSettings?.logo_url ? (
                      <img src={appSettings.logo_url} alt="Logo" className="h-16 object-contain" />
                    ) : (
                      <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-10 h-10 text-indigo-600" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">
                        {appSettings?.logo_subtitle || "Instituição de Ensino"}
                      </h1>
                      <p className="text-gray-600">Sistema de Avaliação</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>Data de Impressão:</p>
                    <p className="font-medium">{format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Título da Prova */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                {customTitle || selectedQuizData?.title || "Prova"}
              </h2>
              {selectedCourseData && (
                <p className="text-gray-600 mt-1">Curso: {selectedCourseData.name}</p>
              )}
              {selectedQuizData?.time_limit_minutes && (
                <div className="flex items-center justify-center gap-2 mt-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Tempo: {selectedQuizData.time_limit_minutes} minutos</span>
                </div>
              )}
            </div>

            {/* Campos do Aluno */}
            {(studentNameField || dateField) && (
              <div className="border border-gray-300 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studentNameField && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Nome do Aluno:</Label>
                      <div className="mt-1 border-b-2 border-gray-400 h-8"></div>
                    </div>
                  )}
                  {dateField && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Data:</Label>
                      <div className="mt-1 border-b-2 border-gray-400 h-8"></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Instruções */}
            {showInstructions && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Instruções
                </h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  {customInstructions ? (
                    <li>{customInstructions}</li>
                  ) : (
                    <>
                      <li>Leia atentamente cada questão antes de responder.</li>
                      <li>Marque apenas UMA alternativa para cada questão.</li>
                      <li>Use caneta azul ou preta.</li>
                      <li>Não é permitido o uso de materiais de consulta.</li>
                      {selectedQuizData?.passing_score && (
                        <li>Nota mínima para aprovação: <strong>{selectedQuizData.passing_score}%</strong></li>
                      )}
                    </>
                  )}
                </ul>
              </div>
            )}

            {/* Questões */}
            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div key={question.id} className="break-inside-avoid">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {qIndex + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium mb-3 leading-relaxed">
                        {question.question_text}
                      </p>
                      <div className="space-y-2 ml-1">
                        {question.options?.map((option, oIndex) => (
                          <div 
                            key={oIndex} 
                            className="flex items-start gap-3"
                          >
                            <div className="flex-shrink-0 w-6 h-6 border-2 border-gray-400 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                              {getLetterOption(oIndex)}
                            </div>
                            <span className="text-gray-700 leading-relaxed pt-0.5">
                              {option.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Espaço para assinatura/observações */}
            <div className="mt-12 pt-6 border-t border-gray-300">
              <p className="text-sm text-gray-500 text-center">
                Boa prova!
              </p>
            </div>

            {/* Gabarito - Nova página */}
            {showAnswerKey && (
              <div className="break-before-page mt-8 pt-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    Gabarito
                  </h2>
                  <p className="text-gray-600 mt-1">{customTitle || selectedQuizData?.title}</p>
                </div>

                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b">Questão</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b">Resposta Correta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((question, qIndex) => {
                        const correctIndex = question.options?.findIndex(o => o.is_correct);
                        const correctLetter = correctIndex >= 0 ? getLetterOption(correctIndex) : "-";
                        
                        return (
                          <tr key={question.id} className={qIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-4 py-2 border-b font-medium">
                              Questão {qIndex + 1}
                            </td>
                            <td className="px-4 py-2 border-b">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full font-bold">
                                {correctLetter}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 text-sm text-gray-500">
                  <p><strong>Total de questões:</strong> {questions.length}</p>
                  {selectedQuizData?.passing_score && (
                    <p><strong>Nota mínima:</strong> {selectedQuizData.passing_score}%</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mensagem quando não há prova selecionada */}
      {(!selectedQuiz || questions.length === 0) && (
        <div className="print:hidden p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <FileQuestion className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {!selectedQuiz ? "Selecione uma prova para imprimir" : "Esta prova não possui questões"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {!selectedQuiz 
                  ? "Escolha um curso e uma prova nas opções acima."
                  : "Adicione questões à prova antes de imprimir."}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estilos de Impressão */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .break-inside-avoid {
            break-inside: avoid;
          }
          
          .break-before-page {
            break-before: page;
          }
        }
      `}</style>
    </div>
  );
}