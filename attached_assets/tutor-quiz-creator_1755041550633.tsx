import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { hapticFeedback } from '@/lib/telegram';

interface QuizQuestion {
  id: string;
  question: string;
  answers: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface TutorQuizCreatorProps {
  onSave: (quiz: { title: string; questions: QuizQuestion[] }) => void;
  onClose: () => void;
}

export function TutorQuizCreator({ onSave, onClose }: TutorQuizCreatorProps) {
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<QuizQuestion>>({
    question: '',
    answers: ['', '', '', ''],
    correctAnswer: 0,
    difficulty: 'easy'
  });
  const [step, setStep] = useState<'setup' | 'questions' | 'preview'>('setup');

  const addQuestion = () => {
    if (currentQuestion.question && currentQuestion.answers?.every(a => a.trim())) {
      const newQuestion: QuizQuestion = {
        id: Date.now().toString(),
        question: currentQuestion.question,
        answers: currentQuestion.answers,
        correctAnswer: currentQuestion.correctAnswer || 0,
        difficulty: currentQuestion.difficulty || 'easy'
      };
      
      setQuestions([...questions, newQuestion]);
      setCurrentQuestion({
        question: '',
        answers: ['', '', '', ''],
        correctAnswer: 0,
        difficulty: 'easy'
      });
      hapticFeedback('medium');
    }
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    hapticFeedback('light');
  };

  const updateAnswer = (index: number, value: string) => {
    const newAnswers = [...(currentQuestion.answers || ['', '', '', ''])];
    newAnswers[index] = value;
    setCurrentQuestion({ ...currentQuestion, answers: newAnswers });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Легкий';
      case 'medium': return 'Средний';
      case 'hard': return 'Сложный';
      default: return difficulty;
    }
  };

  if (step === 'setup') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-tutor-teal">Создание викторины</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="quiz-title">Название викторины</Label>
            <Input
              id="quiz-title"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="Введите название викторины"
              data-testid="input-quiz-title"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-quiz"
            >
              Отмена
            </Button>
            <Button 
              onClick={() => setStep('questions')}
              disabled={!quizTitle.trim()}
              className="flex-1 bg-tutor-teal hover:bg-teal-600"
              data-testid="button-continue-setup"
            >
              Продолжить
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'questions') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-tutor-teal flex items-center justify-between">
            <span>Добавить вопрос</span>
            <Badge variant="outline">{questions.length} вопросов</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="question">Вопрос</Label>
            <Input
              id="question"
              value={currentQuestion.question || ''}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
              placeholder="Введите вопрос"
              data-testid="input-question"
            />
          </div>

          <div>
            <Label>Сложность</Label>
            <div className="flex space-x-2 mt-1">
              {['easy', 'medium', 'hard'].map((difficulty) => (
                <Button
                  key={difficulty}
                  variant={currentQuestion.difficulty === difficulty ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentQuestion({ ...currentQuestion, difficulty: difficulty as any })}
                  data-testid={`button-difficulty-${difficulty}`}
                >
                  {getDifficultyLabel(difficulty)}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Варианты ответов</Label>
            <div className="space-y-2 mt-1">
              {(currentQuestion.answers || ['', '', '', '']).map((answer, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="correct-answer"
                    checked={currentQuestion.correctAnswer === index}
                    onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                    className="text-tutor-teal"
                  />
                  <Input
                    value={answer}
                    onChange={(e) => updateAnswer(index, e.target.value)}
                    placeholder={`Вариант ${index + 1}`}
                    data-testid={`input-answer-${index}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={addQuestion}
              disabled={!currentQuestion.question || !currentQuestion.answers?.every(a => a.trim())}
              className="flex-1"
              data-testid="button-add-question"
            >
              Добавить вопрос
            </Button>
            <Button
              onClick={() => setStep('preview')}
              disabled={questions.length === 0}
              className="flex-1 bg-tutor-teal hover:bg-teal-600"
              data-testid="button-preview-quiz"
            >
              Предпросмотр
            </Button>
          </div>

          {questions.length > 0 && (
            <div className="mt-4">
              <Label>Добавленные вопросы:</Label>
              <div className="space-y-2 mt-2">
                <AnimatePresence>
                  {questions.map((q, index) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{index + 1}. {q.question}</div>
                        <Badge className={getDifficultyColor(q.difficulty)} variant="secondary">
                          {getDifficultyLabel(q.difficulty)}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeQuestion(q.id)}
                        data-testid={`button-remove-question-${q.id}`}
                      >
                        ✕
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === 'preview') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-tutor-teal">Предпросмотр викторины</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-bold">{quizTitle}</h3>
            <p className="text-telegram-secondary">Вопросов: {questions.length}</p>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {questions.map((q, index) => (
              <div key={q.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{index + 1}. {q.question}</span>
                  <Badge className={getDifficultyColor(q.difficulty)} variant="secondary">
                    {getDifficultyLabel(q.difficulty)}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {q.answers.map((answer, answerIndex) => (
                    <div
                      key={answerIndex}
                      className={`text-xs p-1 rounded ${
                        answerIndex === q.correctAnswer
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100'
                      }`}
                    >
                      {String.fromCharCode(65 + answerIndex)}. {answer}
                      {answerIndex === q.correctAnswer && ' ✓'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setStep('questions')}
              className="flex-1"
              data-testid="button-back-to-questions"
            >
              Назад
            </Button>
            <Button
              onClick={() => onSave({ title: quizTitle, questions })}
              className="flex-1 bg-tutor-teal hover:bg-teal-600"
              data-testid="button-save-quiz"
            >
              Сохранить
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}