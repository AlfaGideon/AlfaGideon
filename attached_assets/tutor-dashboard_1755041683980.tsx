import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useTelegram } from '@/components/telegram-provider';
import { AnimatedCard } from '@/components/animated-card';
import { ProgressRing } from '@/components/game-elements/progress-ring';
import { TutorQuizCreator } from '@/components/games/tutor-quiz-creator';
import { motion } from 'framer-motion';

export default function TutorDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useTelegram();
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'students' | 'lessons' | 'tools'>('overview');

  const handleBackToRoles = () => {
    localStorage.removeItem('userRole');
    // Возвращаемся на главную страницу (выбор роли остается доступным)
    setLocation('/');
  };

  const handleQuizSave = (quiz: { title: string; questions: any[] }) => {
    console.log('Quiz saved:', quiz);
    setShowQuizCreator(false);
  };

  const students = [
    { id: 1, name: 'Анна Петрова', level: 'Начальный', progress: 75, lastActive: '2 часа назад' },
    { id: 2, name: 'Джон Смит', level: 'Средний', progress: 45, lastActive: '1 день назад' },
    { id: 3, name: 'Мария Гарсия', level: 'Начальный', progress: 90, lastActive: '30 мин назад' },
  ];

  const myLessons = [
    { id: 1, title: 'Основы русской грамматики', students: 15, status: 'Активный' },
    { id: 2, title: 'Русская литература', students: 8, status: 'Черновик' },
    { id: 3, title: 'Разговорная практика', students: 12, status: 'Активный' },
  ];

  const materials = [
    { id: 1, name: 'Таблица падежей', type: 'PDF', size: '2.3 MB' },
    { id: 2, name: 'Аудио упражнения', type: 'MP3', size: '15.8 MB' },
    { id: 3, name: 'Видео урок: Произношение', type: 'MP4', size: '45.2 MB' },
  ];

  if (showQuizCreator) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center p-4">
        <TutorQuizCreator 
          onSave={handleQuizSave}
          onClose={() => setShowQuizCreator(false)}
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
              Панель репетитора
            </h1>
            {user && (
              <p className="text-sm text-telegram-secondary" data-testid="text-user-name">
                {user.first_name} {user.last_name}
              </p>
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
            { key: 'overview', label: 'Обзор', icon: '📊' },
            { key: 'students', label: 'Ученики', icon: '👥' },
            { key: 'lessons', label: 'Уроки', icon: '📚' },
            { key: 'tools', label: 'Инструменты', icon: '🛠️' }
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={selectedTab === tab.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab(tab.key as any)}
              className={`flex-1 ${selectedTab === tab.key ? 'bg-tutor-teal text-white' : ''}`}
              data-testid={`tab-${tab.key}`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Quick Stats with Progress Rings */}
            <div className="grid grid-cols-3 gap-4">
              <AnimatedCard delay={0.1} testId="stat-students">
                <Card>
                  <CardContent className="p-4 text-center">
                    <ProgressRing 
                      progress={75} 
                      size={60} 
                      color="hsl(162, 63%, 41%)"
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold text-tutor-teal">15</div>
                      </div>
                    </ProgressRing>
                    <div className="text-xs text-telegram-secondary mt-2">Учеников</div>
                  </CardContent>
                </Card>
              </AnimatedCard>
              <AnimatedCard delay={0.2} testId="stat-lessons">
                <Card>
                  <CardContent className="p-4 text-center">
                    <ProgressRing 
                      progress={60} 
                      size={60} 
                      color="hsl(162, 63%, 41%)"
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold text-tutor-teal">3</div>
                      </div>
                    </ProgressRing>
                    <div className="text-xs text-telegram-secondary mt-2">Уроков</div>
                  </CardContent>
                </Card>
              </AnimatedCard>
              <AnimatedCard delay={0.3} testId="stat-materials">
                <Card>
                  <CardContent className="p-4 text-center">
                    <ProgressRing 
                      progress={40} 
                      size={60} 
                      color="hsl(162, 63%, 41%)"
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold text-tutor-teal">8</div>
                      </div>
                    </ProgressRing>
                    <div className="text-xs text-telegram-secondary mt-2">Материалов</div>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>

            {/* Recent Activity */}
            <AnimatedCard delay={0.4} testId="card-recent-activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">📈</span>
                    Последняя активность
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Анна Петрова завершила урок</span>
                      <span className="text-xs text-telegram-secondary">2 часа назад</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Новый ученик: Мария Гарсия</span>
                      <span className="text-xs text-telegram-secondary">1 день назад</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </motion.div>
        )}

        {/* Students Tab */}
        {selectedTab === 'students' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <AnimatedCard delay={0.1} testId="card-students">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">👥</span>
                      Управление учениками
                    </div>
                    <Button size="sm" data-testid="button-add-student">
                      <span className="mr-1">+</span>
                      Добавить
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {students.map((student, index) => (
                      <motion.div 
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{student.name}</h4>
                          <Badge variant="outline">{student.level}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-telegram-secondary">
                          <span>Прогресс: {student.progress}%</span>
                          <span>{student.lastActive}</span>
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-tutor-teal h-1 rounded-full transition-all duration-300"
                              style={{ width: `${student.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </motion.div>
        )}

        {/* Lessons Tab */}
        {selectedTab === 'lessons' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <AnimatedCard delay={0.1} testId="card-lessons">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">📚</span>
                      Мои уроки
                    </div>
                    <Button size="sm" data-testid="button-create-lesson">
                      <span className="mr-1">+</span>
                      Создать урок
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myLessons.map((lesson, index) => (
                      <motion.div 
                        key={lesson.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{lesson.title}</h4>
                          <Badge variant={lesson.status === 'Активный' ? 'default' : 'secondary'}>
                            {lesson.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-telegram-secondary">
                          <span>Учеников: {lesson.students}</span>
                          <Button variant="outline" size="sm">
                            Редактировать
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </motion.div>
        )}

        {/* Tools Tab */}
        {selectedTab === 'tools' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <AnimatedCard delay={0.1} testId="card-tools">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">🛠️</span>
                    Инструменты репетитора
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        className="w-full h-auto p-4 flex flex-col"
                        onClick={() => setShowQuizCreator(true)}
                        data-testid="button-quiz-creator"
                      >
                        <span className="text-2xl mb-2">📝</span>
                        <span className="text-sm">Создать викторину</span>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="w-full h-auto p-4 flex flex-col" data-testid="button-lesson-planner">
                        <span className="text-2xl mb-2">📋</span>
                        <span className="text-sm">Планировщик уроков</span>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="w-full h-auto p-4 flex flex-col" data-testid="button-progress-tracker">
                        <span className="text-2xl mb-2">📊</span>
                        <span className="text-sm">Трекер прогресса</span>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="w-full h-auto p-4 flex flex-col" data-testid="button-material-manager">
                        <span className="text-2xl mb-2">📁</span>
                        <span className="text-sm">Управление материалами</span>
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Materials */}
            <AnimatedCard delay={0.2} testId="card-materials">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">📁</span>
                    Материалы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {materials.map((material, index) => (
                      <motion.div 
                        key={material.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center">
                          <span className="mr-2">
                            {material.type === 'PDF' ? '📄' : material.type === 'MP3' ? '🎵' : '🎬'}
                          </span>
                          <div>
                            <div className="text-sm font-medium">{material.name}</div>
                            <div className="text-xs text-telegram-secondary">{material.size}</div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Загрузить
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}