# Соглашения по разработке - АТТЕСТАТ БЕЗ РЕМНЯ

## Общие принципы кодирования

### Стиль кода
- **TypeScript везде** - полная типизация frontend и backend
- **Функциональный подход** - предпочитаем функции классам где возможно
- **Короткие функции** - максимум 20-30 строк
- **Говорящие имена** - переменные и функции объясняют сами себя
- **Единый стиль** - используем Prettier и ESLint

### Структура файлов
```
project/
├── client/src/           # Frontend React приложение
│   ├── components/       # UI компоненты
│   ├── pages/           # Страницы приложения
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Утилиты и хелперы
├── server/              # Backend Express сервер
│   ├── routes.ts        # API маршруты
│   ├── storage.ts       # Интерфейс хранения данных
│   └── db.ts            # Подключение к БД
├── shared/              # Общие типы и схемы
│   └── schema.ts        # Drizzle схемы и Zod валидация
└── bot/                 # Telegram бот
    └── index.ts         # Основная логика бота
```

## Правила разработки

### ✅ Что МОЖНО и НУЖНО делать

#### Frontend
- Использовать готовые компоненты из Shadcn/ui
- Применять TanStack Query для серверного состояния
- Использовать Zustand для клиентского состояния
- Добавлять data-testid для всех интерактивных элементов
- Применять Wouter для маршрутизации
- Использовать react-hook-form для форм

#### Backend
- Создавать тонкие API маршруты
- Использовать интерфейс IStorage для всех CRUD операций
- Валидировать запросы через Zod схемы
- Обрабатывать ошибки с понятными сообщениями
- Логировать все важные действия

#### База данных
- Использовать Drizzle ORM для типобезопасности
- Создавать миграции через npm run db:push
- Определять схемы в shared/schema.ts
- Создавать insert/select типы через drizzle-zod

### ❌ Что ЗАПРЕЩЕНО

#### Архитектурные запреты
- **НЕ изменять vite.config.ts** - настройка уже готова
- **НЕ редактировать package.json** без острой необходимости
- **НЕ изменять drizzle.config.ts** - конфигурация готова
- **НЕ создавать лишние файлы** - только необходимые

#### Технические запреты
- НЕ использовать сторонние государственные менеджеры кроме Zustand
- НЕ создавать собственные HTTP клиенты - использовать apiRequest
- НЕ писать прямые SQL запросы - только через Drizzle ORM
- НЕ использовать процессы.env на frontend - только import.meta.env.VITE_*

## Паттерны кодирования

### React компоненты
```typescript
// ✅ Правильно
export function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/users', userId],
    enabled: !!userId
  });

  if (isLoading) return <Skeleton />;
  
  return (
    <div data-testid="user-profile">
      <h1 data-testid="user-name">{user?.firstName}</h1>
    </div>
  );
}

// ❌ Неправильно - нет типизации, testid, обработки загрузки
function UserProfile(props) {
  const user = useQuery('/api/users/' + props.userId);
  return <div>{user.firstName}</div>;
}
```

### API маршруты
```typescript
// ✅ Правильно
app.post('/api/users', async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    const user = await storage.createUser(userData);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'Ошибка валидации данных' });
  }
});

// ❌ Неправильно - нет валидации, обработки ошибок
app.post('/api/users', (req, res) => {
  const user = storage.createUser(req.body);
  res.json(user);
});
```

### Работа с состоянием
```typescript
// ✅ Правильно - Zustand store
interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  theme: 'light',
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
}));
```

## Оптимизация производительности

### React оптимизации
- Использовать React.memo для тяжелых компонентов
- Применять useMemo для дорогих вычислений
- Использовать useCallback для стабильных функций
- Избегать инлайн объектов в пропсах

### Сетевые оптимизации
- Кеширование через TanStack Query
- Debounce для поисковых запросов
- Lazy loading для больших списков
- Предзагрузка критических данных

### Database оптимизации
- Индексы для часто запрашиваемых полей
- Пагинация для больших наборов данных
- Select только нужные поля
- Batch операции где возможно

## Безопасность

### Frontend
- Валидация всех пользовательских вводов
- XSS защита через React
- CSP заголовки для безопасности
- Secure cookies для сессий

### Backend
- Валидация через Zod схемы
- Rate limiting для API
- JWT токены с истечением
- Хеширование паролей через bcrypt

### Telegram интеграция
- Проверка подлинности Telegram данных
- Валидация initData
- Защищенные webhook endpoints

## Мониторинг и дебаггинг

### Логирование
```typescript
// ✅ Структурированные логи
logger.info('User action', {
  userId,
  action: 'lesson_complete',
  lessonId,
  timestamp: new Date(),
  metadata: { duration: 1800 }
});

// ❌ Простые строки
console.log('User completed lesson');
```

### Метрики
- API response times
- WebSocket connections
- Database query performance
- Error rates by endpoint

## Тестирование

### Unit тесты
- Компоненты React через React Testing Library
- Утилиты и хелперы через Jest
- API endpoints через supertest

### Integration тесты
- Полные пользовательские сценарии
- Database операции
- WebSocket соединения

## AI-ассистенты в разработке

### Использование LLM
- Генерация компонентов по спецификации
- Рефакторинг с сохранением логики
- Создание тестов для существующего кода
- Документирование API endpoints

### Ограничения AI
- НЕ доверяем сложную бизнес-логику без проверки
- НЕ используем AI для критически важных security решений
- ВСЕГДА проверяем сгенерированный код перед коммитом
- ВСЕГДА тестируем AI-generated код

## Развертывание

### Development
- Hot reload для всех изменений
- Автоматический restart workflow
- Local PostgreSQL через Replit
- Environment variables в .env

### Production
- Replit Deployments
- PostgreSQL managed database
- Environment secrets
- SSL/TLS автоматически

## Коммуникация в команде

### Документация
- Каждая новая фича документируется в replit.md
- ADR для важных архитектурных решений
- API документация через TypeScript типы
- Changelog для пользователей

### Code Review
- Проверка соответствия conventions
- Тестирование новой функциональности
- Проверка производительности
- Валидация безопасности

---

**Помните**: Эти соглашения - живой документ. Обновляйте его по мере развития проекта и появления новых практик.