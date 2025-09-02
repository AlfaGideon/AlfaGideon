import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AdminPasswordModal } from '@/components/admin-password-modal';
import { useTelegram } from '@/components/telegram-provider';
import { showAlert, hapticFeedback } from '@/lib/telegram';
import { motion, AnimatePresence } from 'framer-motion';

export default function Registration() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'welcome' | 'registration' | 'role-selection'>('welcome');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const { user } = useTelegram();

  // Проверяем, зарегистрирован ли пользователь
  useEffect(() => {
    const isRegistered = localStorage.getItem('userRegistered');
    if (isRegistered === 'true') {
      setStep('role-selection');
    }

    // Для разработки: добавляем функцию сброса в глобальную область видимости
    if (typeof window !== 'undefined') {
      (window as any).resetRegistration = () => {
        localStorage.removeItem('userRegistered');
        localStorage.removeItem('userData');
        localStorage.removeItem('userRole');
        window.location.reload();
        console.log('Регистрация сброшена');
      };
    }
  }, []);

  const handleWelcomeNext = () => {
    if (user) {
      // Если пользователь уже авторизован через Telegram, сразу помечаем как зарегистрированного и переходим к выбору роли
      localStorage.setItem('userRegistered', 'true');
      setStep('role-selection');
    } else {
      // Иначе показываем регистрацию
      setStep('registration');
    }
    hapticFeedback('light');
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.firstName && formData.lastName && formData.email) {
      // Сохраняем данные регистрации и помечаем пользователя как зарегистрированного
      localStorage.setItem('userRegistered', 'true');
      localStorage.setItem('userData', JSON.stringify(formData));
      setStep('role-selection');
      hapticFeedback('medium');
    }
  };

  const handleRoleSelection = (role: string) => {
    if (role === 'administrator') {
      setShowAdminModal(true);
    } else {
      localStorage.setItem('userRole', role);
      setLocation(`/${role}`);
      
      const roleTitle = role === 'student' ? 'Ученик' : 'Репетитор';
      showAlert(`Добро пожаловать, ${roleTitle}!`);
    }
    hapticFeedback('medium');
  };

  const handleAdminSuccess = () => {
    localStorage.setItem('userRole', 'administrator');
    setLocation('/administrator');
    showAlert('Добро пожаловать, Администратор!');
  };

  // Скрытый элемент для админ панели
  const handleAdminAccess = () => {
    setAdminClickCount(prev => prev + 1);
    if (adminClickCount >= 4) {
      setShowAdminModal(true);
      setAdminClickCount(0);
    }
    hapticFeedback('light');
  };

  const roles = [
    {
      role: 'student',
      title: 'Ученик',
      description: 'Изучаю русский язык',
      emoji: '🎓',
      color: 'bg-blue-500',
      features: ['Интерактивные уроки', 'Игры и викторины', 'Отслеживание прогресса']
    },
    {
      role: 'tutor',
      title: 'Репетитор',
      description: 'Преподаю русский язык',
      emoji: '👨‍🏫',
      color: 'bg-teal-500',
      features: ['Управление учениками', 'Создание уроков', 'Аналитика']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-20 right-10 w-32 h-32 bg-teal-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-purple-200 rounded-full opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {/* Welcome Screen */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center min-h-screen px-6"
            >
              <div className="text-center space-y-8">
                {/* Logo */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mb-8"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-teal-500 rounded-3xl flex items-center justify-center text-white text-4xl font-bold mx-auto shadow-lg">
                    РМ
                  </div>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h1 className="text-4xl font-bold text-gray-800 mb-4" data-testid="text-app-title">
                    RussianMentor
                  </h1>
                  <p className="text-lg text-gray-600" data-testid="text-app-subtitle">
                    Изучайте русский язык<br />с персональным наставником
                  </p>
                </motion.div>

                {/* Features */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  {['🎮 Игровое обучение', '📚 Интерактивные уроки', '👨‍🏫 Опытные репетиторы'].map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className="flex items-center justify-center text-gray-700"
                    >
                      <span className="text-lg">{feature}</span>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Get Started Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                >
                  <Button
                    onClick={handleWelcomeNext}
                    size="lg"
                    className="bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white px-8 py-6 text-lg rounded-full shadow-lg"
                    data-testid="button-get-started"
                  >
                    Начать обучение
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Registration Form */}
          {step === 'registration' && (
            <motion.div
              key="registration"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center min-h-screen px-6"
            >
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle className="text-center text-2xl">Регистрация</CardTitle>
                  <p className="text-center text-gray-600">Создайте свой профиль</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="firstName">Имя</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        placeholder="Введите ваше имя"
                        required
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Фамилия</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        placeholder="Введите вашу фамилию"
                        required
                        data-testid="input-last-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="example@email.com"
                        required
                        data-testid="input-email"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 to-teal-500"
                      data-testid="button-register"
                    >
                      Продолжить
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Role Selection */}
          {step === 'role-selection' && (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center min-h-screen px-6"
            >
              <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-gray-800">Выберите свою роль</h2>
                  <p className="text-gray-600">Как вы планируете использовать платформу?</p>
                  {(user || formData.firstName) && (
                    <p className="text-sm text-gray-500">
                      Привет, {user?.first_name || formData.firstName}!
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {roles.map((role, index) => (
                    <motion.div
                      key={role.role}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.2 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className="cursor-pointer border-2 hover:border-blue-300 transition-all duration-200"
                        onClick={() => handleRoleSelection(role.role)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 ${role.color} rounded-full flex items-center justify-center text-white text-2xl`}>
                              {role.emoji}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-800">{role.title}</h3>
                              <p className="text-gray-600 text-sm mb-3">{role.description}</p>
                              <div className="flex flex-wrap gap-1">
                                {role.features.map((feature, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Кнопка "Назад" удалена - регистрация должна быть разовой */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden Admin Access - нестандартный элемент внизу слева */}
        <motion.div
          className="fixed bottom-4 left-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <motion.button
            onClick={handleAdminAccess}
            className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full shadow-lg opacity-30 hover:opacity-60 transition-all duration-300"
            whileHover={{ scale: 1.1, rotate: 45 }}
            whileTap={{ scale: 0.9 }}
            data-testid="button-admin-access"
          >
            <div className="w-2 h-2 bg-white rounded-full mx-auto"></div>
          </motion.button>
          {adminClickCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-8 left-0 text-xs text-gray-500"
            >
              {5 - adminClickCount} клика
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Admin Password Modal */}
      <AdminPasswordModal
        isOpen={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          setAdminClickCount(0);
        }}
        onSuccess={handleAdminSuccess}
      />
    </div>
  );
}