import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from 'wouter';
import { useTelegram } from '@/components/telegram-provider';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useTelegram();

  const handleBackToRoles = () => {
    localStorage.removeItem('userRole');
    // Возвращаемся на главную страницу (выбор роли остается доступным)
    setLocation('/');
  };

  const users = [
    { id: 1, name: 'Анна Петрова', role: 'student', status: 'Активный', lastActive: '2 часа назад' },
    { id: 2, name: 'Иван Сидоров', role: 'tutor', status: 'Активный', lastActive: '1 час назад' },
    { id: 3, name: 'Джон Смит', role: 'student', status: 'Заблокирован', lastActive: '3 дня назад' },
    { id: 4, name: 'Мария Попова', role: 'tutor', status: 'Активный', lastActive: '30 мин назад' },
  ];

  const systemStats = [
    { label: 'Всего пользователей', value: '156', change: '+12' },
    { label: 'Активных учеников', value: '89', change: '+5' },
    { label: 'Репетиторов', value: '23', change: '+2' },
    { label: 'Завершенных уроков', value: '342', change: '+28' },
  ];

  const systemSettings = [
    { id: 1, name: 'Автоматическая регистрация', enabled: true },
    { id: 2, name: 'Уведомления в Telegram', enabled: true },
    { id: 3, name: 'Режим обслуживания', enabled: false },
    { id: 4, name: 'Логирование действий', enabled: true },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student': return 'bg-student-blue';
      case 'tutor': return 'bg-tutor-teal';
      case 'administrator': return 'bg-admin-red';
      default: return 'bg-gray-500';
    }
  };

  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'student': return 'Ученик';
      case 'tutor': return 'Репетитор';
      case 'administrator': return 'Админ';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-telegram-bg">
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-200">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-telegram-text" data-testid="text-dashboard-title">
              Панель администратора
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

      <div className="px-4 py-6">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics" data-testid="tab-analytics">Аналитика</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Пользователи</TabsTrigger>
            <TabsTrigger value="access" data-testid="tab-access">Доступ</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Настройки</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {/* System Statistics */}
            <div className="grid grid-cols-2 gap-4">
              {systemStats.map((stat, index) => (
                <Card key={index} data-testid={`stat-${index}`}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-admin-red">{stat.value}</div>
                      <div className="text-xs text-telegram-secondary">{stat.label}</div>
                      <div className="text-xs text-green-600 mt-1">{stat.change}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Analytics Chart Placeholder */}
            <Card data-testid="card-analytics-chart">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-admin-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  Активность пользователей
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-telegram-secondary">График активности за последние 30 дней</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* User Management */}
            <Card data-testid="card-user-management">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-admin-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"></path>
                    </svg>
                    Управление пользователями
                  </div>
                  <Button size="sm" data-testid="button-add-user">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Добавить
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${getRoleColor(user.role)}`}></div>
                          <h4 className="font-medium text-sm">{user.name}</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{getRoleTitle(user.role)}</Badge>
                          <Badge variant={user.status === 'Активный' ? 'default' : 'destructive'}>
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-telegram-secondary">
                        <span>Последняя активность: {user.lastActive}</span>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline" data-testid={`button-edit-user-${user.id}`}>
                            Изменить
                          </Button>
                          <Button size="sm" variant="outline" data-testid={`button-block-user-${user.id}`}>
                            {user.status === 'Активный' ? 'Заблокировать' : 'Разблокировать'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-6">
            {/* Access Control */}
            <Card data-testid="card-access-control">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-admin-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  Контроль доступа
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Пароль администратора</h4>
                    <p className="text-sm text-telegram-secondary mb-3">
                      Текущий пароль: admin123
                    </p>
                    <Button variant="outline" data-testid="button-change-admin-password">
                      Изменить пароль
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Роли пользователей</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Учеников:</span>
                        <span className="font-medium">89</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Репетиторов:</span>
                        <span className="font-medium">23</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Администраторов:</span>
                        <span className="font-medium">3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* System Settings */}
            <Card data-testid="card-system-settings">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-admin-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Настройки системы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemSettings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">{setting.name}</span>
                      <Button 
                        size="sm" 
                        variant={setting.enabled ? "default" : "outline"}
                        data-testid={`button-toggle-setting-${setting.id}`}
                      >
                        {setting.enabled ? 'Включено' : 'Отключено'}
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium mb-3">Действия системы</h4>
                  <div className="flex flex-col space-y-2">
                    <Button variant="outline" data-testid="button-export-data">
                      Экспорт данных
                    </Button>
                    <Button variant="outline" data-testid="button-backup-system">
                      Резервная копия
                    </Button>
                    <Button variant="destructive" data-testid="button-reset-system">
                      Сброс системы
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
