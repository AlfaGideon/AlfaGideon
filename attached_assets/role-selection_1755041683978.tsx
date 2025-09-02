import { useState } from 'react';
import { useLocation } from 'wouter';
import { RoleCard } from '@/components/role-card';
import { AdminPasswordModal } from '@/components/admin-password-modal';
import { useTelegram } from '@/components/telegram-provider';
import { showAlert } from '@/lib/telegram';

export default function RoleSelection() {
  const [, setLocation] = useLocation();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const { user } = useTelegram();

  const handleRoleSelection = (role: string) => {
    if (role === 'administrator') {
      setShowAdminModal(true);
    } else {
      // Store role in localStorage for persistence
      localStorage.setItem('userRole', role);
      setLocation(`/${role}`);
      
      const roleTitle = role === 'student' ? 'Ученик' : 'Репетитор';
      showAlert(`Добро пожаловать, ${roleTitle}!`);
    }
  };

  const handleAdminSuccess = () => {
    localStorage.setItem('userRole', 'administrator');
    setLocation('/administrator');
    showAlert('Добро пожаловать, Администратор!');
  };

  const roles = [
    {
      role: 'student' as const,
      title: 'Ученик',
      description: 'Изучаю русский язык',
      features: [
        'Интерактивные уроки',
        'Музыка для изучения',
        'Тесты и упражнения',
        'Психологическая поддержка'
      ],
      color: 'hsl(217, 78%, 58%)', // student-blue
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
      )
    },
    {
      role: 'tutor' as const,
      title: 'Репетитор',
      description: 'Преподаю русский язык',
      features: [
        'Управление учениками',
        'Создание уроков',
        'Отслеживание прогресса',
        'Материалы для обучения'
      ],
      color: 'hsl(174, 62%, 47%)', // tutor-teal
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
      )
    },
    {
      role: 'administrator' as const,
      title: 'Администратор',
      description: 'Управляю платформой (закрытый пароль)',
      features: [
        'Управление пользователями',
        'Контроль доступа',
        'Аналитика',
        'Настройки системы'
      ],
      color: 'hsl(4, 85%, 63%)', // admin-red
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-telegram-bg">
      {/* Header Section */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-telegram-text mb-2" data-testid="text-app-title">
              RussianMentor
            </h1>
            <p className="text-telegram-secondary text-sm" data-testid="text-app-subtitle">
              Выберите свою роль для входа в систему
            </p>
            {user && (
              <p className="text-xs text-telegram-secondary mt-1" data-testid="text-user-greeting">
                Привет, {user.first_name}!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {roles.map((roleData) => (
          <RoleCard
            key={roleData.role}
            {...roleData}
            onClick={() => handleRoleSelection(roleData.role)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-6 text-center">
        <div className="text-telegram-secondary text-xs space-y-2">
          <p data-testid="text-app-version">RussianMentor v1.0</p>
          <p data-testid="text-app-description">Платформа для изучения русского языка</p>
        </div>
      </div>

      {/* Admin Password Modal */}
      <AdminPasswordModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={handleAdminSuccess}
      />
    </div>
  );
}
