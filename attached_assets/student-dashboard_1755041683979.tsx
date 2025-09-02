import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLocation } from 'wouter';
import { useTelegram } from '@/components/telegram-provider';
import { AnimatedCard } from '@/components/animated-card';
import { ProgressRing } from '@/components/game-elements/progress-ring';
import { StreakBadge } from '@/components/game-elements/streak-badge';
import { AchievementBadge } from '@/components/game-elements/achievement-badge';
import { ExperienceBar } from '@/components/game-elements/experience-bar';
import { Leaderboard } from '@/components/game-elements/leaderboard';
import { WordMemoryGame } from '@/components/games/word-memory-game';
import { motion } from 'framer-motion';

export default function StudentDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useTelegram();
  const [showGame, setShowGame] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'lessons' | 'games' | 'achievements' | 'leaderboard'>('lessons');

  const handleBackToRoles = () => {
    localStorage.removeItem('userRole');
    // Возвращаемся на главную страницу (выбор роли остается доступным)
    setLocation('/');
  };

  const handleGameComplete = (score: number) => {
    console.log('Game completed with score:', score);
    setShowGame(false);
  };

  const lessons = [
    { id: 1, title: 'Алфавит и произношение', progress: 100, level: 'Начальный' },
    { id: 2, title: 'Основные слова и фразы', progress: 75, level: 'Начальный' },
    { id: 3, title: 'Падежи в русском языке', progress: 30, level: 'Средний' },
    { id: 4, title: 'Глаголы движения', progress: 0, level: 'Средний' },
  ];

  const achievements = [
    { title: 'Первые шаги', description: 'Завершить первый урок', icon: '🎯', unlocked: true, rarity: 'common' as const },
    { title: 'Словарный запас', description: 'Выучить 50 слов', icon: '📚', unlocked: true, rarity: 'rare' as const },
    { title: 'Серия побед', description: '7 дней подряд', icon: '🔥', unlocked: false, rarity: 'epic' as const },
    { title: 'Полиглот', description: 'Достичь уровня B1', icon: '🏆', unlocked: false, rarity: 'legendary' as const },
  ];

  const leaderboardData = [
    { id: '1', name: 'Анна Петрова', score: 2450, level: 5, streak: 12 },
    { id: '2', name: 'Джон Смит', score: 2380, level: 4, streak: 8 },
    { id: '3', name: 'Мария Гарсия', score: 2250, level: 4, streak: 15 },
    { id: user?.id.toString() || '4', name: user?.first_name + ' ' + (user?.last_name || ''), score: 1890, level: 3, streak: 5 },
    { id: '5', name: 'Алексей Иванов', score: 1750, level: 3, streak: 3 },
  ];

  if (showGame) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center p-4">
        <WordMemoryGame 
          onComplete={handleGameComplete}
          onClose={() => setShowGame(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-200">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-telegram-text" data-testid="text-dashboard-title">
              Панель ученика
            </h1>
            {user && (
              <div className="flex items-center space-x-2">
                <p className="text-sm text-telegram-secondary" data-testid="text-user-name">
                  {user.first_name} {user.last_name}
                </p>
                <StreakBadge days={5} />
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBackToRoles}
            data-testid="button-back-to-roles"
          >
            Назад
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 py-3 bg-white border-b">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'lessons', label: 'Уроки', icon: '📚' },
            { key: 'games', label: 'Игры', icon: '🎮' },
            { key: 'achievements', label: 'Достижения', icon: '🏆' },
            { key: 'leaderboard', label: 'Рейтинг', icon: '📊' }
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={selectedTab === tab.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab(tab.key as any)}
              className={`flex-1 ${selectedTab === tab.key ? 'bg-student-blue text-white' : ''}`}
              data-testid={`tab-${tab.key}`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Experience Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ExperienceBar
            currentXP={1890}
            nextLevelXP={2500}
            level={3}
            data-testid="experience-bar"
          />
        </motion.div>

        {/* Lessons Tab */}
        {selectedTab === 'lessons' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Progress Overview */}
            <AnimatedCard delay={0.1} testId="card-progress-overview">
              <Card>
                <CardHeader>
                  <CardTitle className="text-student-blue">Общий прогресс</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-4">
                    <ProgressRing 
                      progress={51} 
                      size={100} 
                      color="hsl(217, 78%, 58%)"
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold text-student-blue">51%</div>
                        <div className="text-xs text-telegram-secondary">завершено</div>
                      </div>
                    </ProgressRing>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-blue-50 rounded-lg p-3"
                    >
                      <div className="text-2xl font-bold text-student-blue">1</div>
                      <div className="text-xs text-telegram-secondary">Завершено</div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-orange-50 rounded-lg p-3"
                    >
                      <div className="text-2xl font-bold text-orange-500">1</div>
                      <div className="text-xs text-telegram-secondary">В процессе</div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Interactive Lessons */}
            <AnimatedCard delay={0.2} testId="card-lessons">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    Интерактивные уроки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lessons.map((lesson, index) => (
                      <motion.div 
                        key={lesson.id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{lesson.title}</h4>
                          <Badge variant={lesson.level === 'Начальный' ? 'default' : 'secondary'}>
                            {lesson.level}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <Progress value={lesson.progress} className="flex-1 mr-3 h-1" />
                          <span className="text-telegram-secondary">{lesson.progress}%</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </motion.div>
        )}

        {/* Games Tab */}
        {selectedTab === 'games' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <AnimatedCard delay={0.1} testId="card-games">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">🎮</span>
                    Обучающие игры
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        className="w-full h-auto p-4 flex flex-col"
                        onClick={() => setShowGame(true)}
                        data-testid="button-memory-game"
                      >
                        <span className="text-2xl mb-2">🧠</span>
                        <span className="text-sm">Память слов</span>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="w-full h-auto p-4 flex flex-col" data-testid="button-quiz-game">
                        <span className="text-2xl mb-2">❓</span>
                        <span className="text-sm">Викторина</span>
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </motion.div>
        )}

        {/* Achievements Tab */}
        {selectedTab === 'achievements' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <AnimatedCard delay={0.1} testId="card-achievements">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">🏆</span>
                    Достижения
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {achievements.map((achievement, index) => (
                      <AchievementBadge
                        key={index}
                        {...achievement}
                        className="animate-pulse"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </motion.div>
        )}

        {/* Leaderboard Tab */}
        {selectedTab === 'leaderboard' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <AnimatedCard delay={0.1} testId="card-leaderboard">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">📊</span>
                    Рейтинг учеников
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Leaderboard 
                    entries={leaderboardData}
                    currentUserId={user?.id.toString()}
                  />
                </CardContent>
              </Card>
            </AnimatedCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}