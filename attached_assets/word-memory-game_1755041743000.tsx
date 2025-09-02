import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hapticFeedback, notificationFeedback } from '@/lib/telegram';

interface WordPair {
  russian: string;
  translation: string;
}

interface WordMemoryGameProps {
  onComplete: (score: number) => void;
  onClose: () => void;
}

export function WordMemoryGame({ onComplete, onClose }: WordMemoryGameProps) {
  const [gameState, setGameState] = useState<'memorize' | 'test' | 'complete'>('memorize');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const words: WordPair[] = [
    { russian: 'дом', translation: 'house' },
    { russian: 'собака', translation: 'dog' },
    { russian: 'кот', translation: 'cat' },
    { russian: 'солнце', translation: 'sun' },
    { russian: 'вода', translation: 'water' },
    { russian: 'хлеб', translation: 'bread' },
    { russian: 'молоко', translation: 'milk' },
    { russian: 'стол', translation: 'table' }
  ];

  const [shuffledWords] = useState(() => [...words].sort(() => Math.random() - 0.5));

  useEffect(() => {
    if (gameState === 'memorize' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'memorize' && timeLeft === 0) {
      setGameState('test');
      setCurrentIndex(0);
    }
  }, [timeLeft, gameState]);

  const generateAnswers = (correctAnswer: string) => {
    const incorrect = words
      .filter(w => w.translation !== correctAnswer)
      .map(w => w.translation)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    return [correctAnswer, ...incorrect].sort(() => Math.random() - 0.5);
  };

  const [answers, setAnswers] = useState<string[]>([]);

  useEffect(() => {
    if (gameState === 'test' && currentIndex < shuffledWords.length) {
      setAnswers(generateAnswers(shuffledWords[currentIndex].translation));
    }
  }, [gameState, currentIndex]);

  const handleAnswer = (answer: string) => {
    const isCorrect = answer === shuffledWords[currentIndex].translation;
    setSelectedAnswer(answer);
    setShowFeedback(true);

    if (isCorrect) {
      setScore(score + 10);
      hapticFeedback('heavy');
      notificationFeedback('success');
    } else {
      hapticFeedback('medium');
      notificationFeedback('error');
    }

    setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer(null);
      
      if (currentIndex + 1 >= shuffledWords.length) {
        setGameState('complete');
        onComplete(score + (isCorrect ? 10 : 0));
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    }, 1500);
  };

  if (gameState === 'memorize') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-student-blue">Запомните слова</CardTitle>
          <div className="text-2xl font-bold text-orange-500">
            {timeLeft}с
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {shuffledWords.slice(0, 6).map((word, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2 }}
                className="text-center p-3 bg-blue-50 rounded-lg"
              >
                <div className="font-bold text-lg">{word.russian}</div>
                <div className="text-sm text-telegram-secondary">{word.translation}</div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (gameState === 'test') {
    const currentWord = shuffledWords[currentIndex];
    
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-student-blue">
            Вопрос {currentIndex + 1} из {shuffledWords.length}
          </CardTitle>
          <div className="text-xl">Очки: {score}</div>
        </CardHeader>
        <CardContent>
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="text-3xl font-bold mb-2">{currentWord.russian}</div>
            <div className="text-telegram-secondary">Выберите перевод:</div>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {answers.map((answer, index) => {
                const isCorrect = answer === currentWord.translation;
                const isSelected = selectedAnswer === answer;
                
                return (
                  <motion.div
                    key={answer}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Button
                      variant="outline"
                      className={`w-full h-auto p-4 text-center transition-all ${
                        showFeedback && isSelected
                          ? isCorrect
                            ? 'bg-green-100 border-green-500 text-green-700'
                            : 'bg-red-100 border-red-500 text-red-700'
                          : 'hover:bg-blue-50'
                      } ${
                        showFeedback && isCorrect && !isSelected
                          ? 'bg-green-50 border-green-300'
                          : ''
                      }`}
                      onClick={() => !showFeedback && handleAnswer(answer)}
                      disabled={showFeedback}
                      data-testid={`answer-${index}`}
                    >
                      {answer}
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (gameState === 'complete') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-student-blue">Игра завершена!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="mb-4"
          >
            <div className="text-4xl font-bold text-student-blue mb-2">
              {score} очков
            </div>
            <div className="text-lg text-telegram-secondary">
              {score >= 60 ? 'Отлично!' : score >= 40 ? 'Хорошо!' : 'Продолжайте практиковаться!'}
            </div>
          </motion.div>
          
          <div className="space-y-2">
            <Button 
              onClick={onClose} 
              className="w-full"
              data-testid="button-close-game"
            >
              Закрыть
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}