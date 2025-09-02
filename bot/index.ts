import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { storage } from '../server/storage';
import { insertUserSchema, insertMessageSchema, insertGameScoreSchema } from '../shared/schema';
import type { User } from '../shared/schema';

// Загружаем переменные окружения
dotenv.config();

let bot: TelegramBot | null = null;

// Интерфейс для пользовательских данных
interface BotUser {
  id: string;
  telegramId: string;
  firstName: string;
  lastName: string;
  username?: string;
  role: 'student' | 'tutor' | 'admin';
  currentMenu?: string;
  awaitingInput?: string;
}

// Хранилище активных пользователей
const activeBotUsers: Map<string, BotUser> = new Map();

// Функция инициализации бота
export async function initializeBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'your_telegram_bot_token_here') {
    console.log('❌ TELEGRAM_BOT_TOKEN не настроен. Бот не будет запущен.');
    console.log('💡 Для работы бота получите токен у @BotFather в Telegram и добавьте его в переменные окружения.');
    return;
  }

  try {
    // Создаем бота
    bot = new TelegramBot(token, { polling: true });
    
    console.log('🤖 Telegram бот инициализирован и запущен');
    
    // Настраиваем обработчики событий
    setupBotHandlers();
    
  } catch (error) {
    console.error('❌ Ошибка при инициализации бота:', error);
  }
}

// Функция настройки обработчиков
function setupBotHandlers(): void {
  if (!bot) return;

// Основные команды
const MAIN_MENU_COMMANDS = {
  STUDENT: [
    { text: '📚 Уроки', callback_data: 'lessons' },
    { text: '🎮 Игры', callback_data: 'games' },
    { text: '💬 Чат с преподавателем', callback_data: 'chat' },
    { text: '🏆 Достижения', callback_data: 'achievements' },
    { text: '📊 Прогресс', callback_data: 'progress' },
    { text: '🏅 Таблица лидеров', callback_data: 'leaderboard' },
    { text: '🔄 Сменить роль', callback_data: 'change_role' },
    { text: '⚙️ Настройки', callback_data: 'settings' }
  ],
  TUTOR: [
    { text: '👥 Мои студенты', callback_data: 'my_students' },
    { text: '📚 Создать урок', callback_data: 'create_lesson' },
    { text: '📝 Создать квиз', callback_data: 'create_quiz' },
    { text: '📁 Материалы', callback_data: 'materials' },
    { text: '🎯 Игра Эрудит', callback_data: 'erudit_game' },
    { text: '📊 Аналитика', callback_data: 'analytics' },
    { text: '🔄 Сменить роль', callback_data: 'change_role' },
    { text: '⚙️ Настройки', callback_data: 'settings' }
  ],
  ADMIN: [
    { text: '👥 Управление пользователями', callback_data: 'manage_users' },
    { text: '📊 Системная статистика', callback_data: 'system_stats' },
    { text: '📁 Управление контентом', callback_data: 'manage_content' },
    { text: '🛠️ Системные настройки', callback_data: 'system_settings' },
    { text: '📋 Логи админа', callback_data: 'admin_logs' },
    { text: '🔄 Сменить роль', callback_data: 'change_role' }
  ]
};

// Роли для выбора
const ROLE_SELECTION = [
  { text: '🎓 Студент', callback_data: 'select_role_student' },
  { text: '👨‍🏫 Преподаватель', callback_data: 'select_role_tutor' },
  { text: '🛠️ Администратор', callback_data: 'select_role_admin' }
];

// Константа для ID администратора
const ADMIN_TELEGRAM_ID = '6240695985';

// Функция проверки прав администратора
function isAuthorizedAdmin(telegramId: string): boolean {
  return telegramId === ADMIN_TELEGRAM_ID;
}

// Функция для получения или создания пользователя
async function getOrCreateUser(telegramUser: TelegramBot.User, chatId: number, skipRoleSelection = false): Promise<BotUser | null> {
  const telegramId = telegramUser.id.toString();
  
  try {
    // Проверяем, есть ли пользователь в базе данных
    let user = await storage.getUserByTelegramId(telegramId);
    
    // Автоматически назначаем админа для указанного ID
    const isAdmin = isAuthorizedAdmin(telegramId);
    
    if (!user && !skipRoleSelection && !isAdmin) {
      // Новый пользователь - показываем выбор роли
      return null;
    }
    
    if (!user) {
      // Создаем нового пользователя
      const defaultRole = isAdmin ? 'admin' : 'student';
      const newUser = {
        username: telegramUser.username || `user_${telegramId}`,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name || '',
        role: defaultRole,
        telegramId: telegramId,
        telegramUsername: telegramUser.username,
        telegramChatId: chatId.toString(),
        telegramAuthDate: new Date(),
        level: 1,
        experience: 0,
        streak: 0,
        isOnline: true
      };
      
      user = await storage.createUser(newUser);
    } else {
      // Обновляем информацию о пользователе
      const updates: any = {
        telegramChatId: chatId.toString(),
        isOnline: true,
        lastActivity: new Date()
      };
      
      // Автоматически обновляем роль для админа
      if (isAdmin && user.role !== 'admin') {
        updates.role = 'admin';
      }
      
      await storage.updateUser(user.id, updates);
      user.role = updates.role || user.role;
    }
    
    const botUser: BotUser = {
      id: user.id,
      telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role as 'student' | 'tutor' | 'admin'
    };
    
    activeBotUsers.set(telegramId, botUser);
    return botUser;
    
  } catch (error) {
    console.error('Ошибка при получении/создании пользователя:', error);
    // Возвращаем базового пользователя в случае ошибки
    const botUser: BotUser = {
      id: 'temp',
      telegramId,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name || '',
      role: isAuthorizedAdmin(telegramId) ? 'admin' : 'student'
    };
    return botUser;
  }
}

// Функция для показа выбора роли
async function showRoleSelection(chatId: number, telegramUser: TelegramBot.User) {
  if (!bot) return;
  
  // Определяем доступные роли
  const availableRoles = [ROLE_SELECTION[0], ROLE_SELECTION[1]];
  
  // Добавляем роль администратора только для авторизованного пользователя
  if (isAuthorizedAdmin(telegramUser.id.toString())) {
    availableRoles.push(ROLE_SELECTION[2]);
  }
  
  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [availableRoles[0], availableRoles[1]],
      ...(availableRoles[2] ? [[availableRoles[2]]] : [])
    ]
  };
  
  let welcomeText = `🎯 <b>АТТЕСТАТ БЕЗ РЕМНЯ</b>\n\n`;
  welcomeText += `👋 Добро пожаловать, <b>${telegramUser.first_name}</b>!\n\n`;
  welcomeText += `🌟 Это интерактивная платформа для изучения русского языка с:\n`;
  welcomeText += `   • 📚 Уроками и теорией\n`;
  welcomeText += `   • 🎮 Развивающими играми\n`;
  welcomeText += `   • 💬 Чатом с преподавателями\n`;
  welcomeText += `   • 🏆 Системой достижений\n\n`;
  welcomeText += `<i>Пожалуйста, выберите вашу роль:</i>`;
  
  await bot!.sendMessage(chatId, welcomeText, {
    reply_markup: keyboard,
    parse_mode: 'HTML'
  });
}

// Функция для отправки главного меню
async function sendMainMenu(chatId: number, user: BotUser) {
  if (!bot) return;
  
  const commands = MAIN_MENU_COMMANDS[user.role.toUpperCase() as keyof typeof MAIN_MENU_COMMANDS] || MAIN_MENU_COMMANDS.STUDENT;
  
  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: []
  };
  
  // Разбиваем команды на строки по 2
  for (let i = 0; i < commands.length; i += 2) {
    const row = commands.slice(i, i + 2);
    keyboard.inline_keyboard.push(row);
  }
  
  const roleText = user.role === 'student' ? '🎓 Студент' : 
                  user.role === 'tutor' ? '👨‍🏫 Преподаватель' : '🛠️ Администратор';
  
  const userLevel = await getUserLevel(user.id);
  const userData = await storage.getUser(user.id);
  
  let welcomeText = `┌─────────────────────────┐\n`;
  welcomeText += `│  🎯 АТТЕСТАТ БЕЗ РЕМНЯ  │\n`;
  welcomeText += `└─────────────────────────┘\n\n`;
  welcomeText += `👋 Добро пожаловать, <b>${user.firstName}</b>!\n\n`;
  welcomeText += `🔹 <b>Роль:</b> ${roleText}\n`;
  welcomeText += `🔹 <b>Уровень:</b> ${userLevel}\n`;
  
  if (userData) {
    welcomeText += `🔹 <b>Опыт:</b> ${userData.experience || 0} XP\n`;
    welcomeText += `🔹 <b>Стрик:</b> ${userData.streak || 0} дней\n`;
  }
  
  if (user.role === 'admin') {
    const totalUsers = await storage.getUsersCount();
    welcomeText += `\n🛠️ <b>Админ статистика:</b>\n`;
    welcomeText += `   • Всего пользователей: ${totalUsers}\n`;
  }
  
  welcomeText += `\n💡 <i>Выберите действие из меню ниже:</i>`;
  
  await bot!.sendMessage(chatId, welcomeText, {
    reply_markup: keyboard,
    parse_mode: 'HTML'
  });
}

// Функция для получения уровня пользователя
async function getUserLevel(userId: string): Promise<number> {
  try {
    const user = await storage.getUser(userId);
    return user?.level || 1;
  } catch {
    return 1;
  }
}

// Функция для получения количества непрочитанных сообщений
async function getUnreadMessagesCount(chatId: string, userId: string): Promise<number> {
  try {
    const messages = await storage.getMessagesByChat(chatId, 50);
    return messages.filter(m => m.senderId !== userId && !m.isRead).length;
  } catch {
    return 0;
  }
}

// Функция для создания лога администратора
async function createAdminLog(adminId: string, action: string, details?: string): Promise<void> {
  try {
    await storage.createAdminLog({
      adminId,
      action,
      details
    });
  } catch (error) {
    console.error('Ошибка при создании лога администратора:', error);
  }
}

// Команда /start
bot!.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramUser = msg.from!;
  
  try {
    const user = await getOrCreateUser(telegramUser, chatId);
    if (user) {
      await sendMainMenu(chatId, user);
    } else {
      await showRoleSelection(chatId, telegramUser);
    }
  } catch (error) {
    console.error('Ошибка в команде /start:', error);
    await bot!.sendMessage(chatId, 'Произошла ошибка при запуске. Попробуйте еще раз.');
  }
});

// Команда /menu
bot!.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from!.id.toString();
  const user = activeBotUsers.get(telegramId);
  
  if (user) {
    await sendMainMenu(chatId, user);
  } else {
    await bot!.sendMessage(chatId, 'Пожалуйста, используйте /start для начала работы.');
  }
});

// Команда /reset для сброса аккаунта
bot!.onText(/\/reset/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramUser = msg.from!;
  const telegramId = telegramUser.id.toString();
  
  try {
    // Удаляем пользователя из активных
    activeBotUsers.delete(telegramId);
    
    // Показываем выбор роли как для нового пользователя
    await bot!.sendMessage(chatId, '🔄 Аккаунт сброшен!\n\nВыберите новую роль:');
    await showRoleSelection(chatId, telegramUser);
    
  } catch (error) {
    console.error('Ошибка при сбросе аккаунта:', error);
    await bot!.sendMessage(chatId, 'Произошла ошибка при сбросе. Попробуйте /start');
  }
});

// Обработка callback-запросов
bot!.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg!.chat.id;
  const data = callbackQuery.data!;
  const telegramId = callbackQuery.from.id.toString();
  const user = activeBotUsers.get(telegramId);
  
  try {
    // Отвечаем на callback запрос сразу, чтобы избежать timeout
    await bot!.answerCallbackQuery(callbackQuery.id).catch(() => {
      // Игнорируем ошибки от старых callback запросов
      console.log('Callback query timeout - ignoring');
    });
    
    if (!user && !data.startsWith('select_role_')) {
      return;
    }
  
    switch (data) {
      case 'lessons':
        if (user) await handleLessons(chatId, user);
        break;
      case 'games':
        if (user) await handleGames(chatId, user);
        break;
      case 'chat':
        if (user) await handleChat(chatId, user);
        break;
      case 'achievements':
        if (user) await handleAchievements(chatId, user);
        break;
      case 'progress':
        if (user) await handleProgress(chatId, user);
        break;
      case 'leaderboard':
        if (user) await handleLeaderboard(chatId, user);
        break;
      case 'settings':
        if (user) await handleSettings(chatId, user);
        break;
      case 'my_students':
        if (user) await handleMyStudents(chatId, user);
        break;
      case 'create_lesson':
        if (user) await handleCreateLesson(chatId, user);
        break;
      case 'create_quiz':
        if (user) await handleCreateQuiz(chatId, user);
        break;
      case 'materials':
        if (user) await handleMaterials(chatId, user);
        break;
      case 'erudit_game':
        if (user) await handleEruditGame(chatId, user);
        break;
      case 'analytics':
        if (user) await handleAnalytics(chatId, user);
        break;
      case 'manage_users':
        if (user) await handleManageUsers(chatId, user);
        break;
      case 'system_stats':
        if (user) await handleSystemStats(chatId, user);
        break;
      case 'manage_content':
        if (user) await handleManageContent(chatId, user);
        break;
      case 'system_settings':
        if (user) await handleSystemSettings(chatId, user);
        break;
      case 'admin_logs':
        if (user) await handleAdminLogs(chatId, user);
        break;
      case 'change_role':
        if (user) await handleChangeRole(chatId, user);
        break;
      case 'select_role_student':
        await handleSelectRole(chatId, callbackQuery.from, 'student');
        break;
      case 'select_role_tutor':
        await handleSelectRole(chatId, callbackQuery.from, 'tutor');
        break;
      case 'select_role_admin':
        // Проверяем права доступа к админ роли
        if (isAuthorizedAdmin(callbackQuery.from.id.toString())) {
          await handleSelectRole(chatId, callbackQuery.from, 'admin');
        } else {
          await bot!.sendMessage(chatId, '🚫 Доступ запрещен!\n\nТолько авторизованные пользователи могут получить роль администратора.', {
            reply_markup: {
              inline_keyboard: [[{ text: '🔙 Назад к выбору роли', callback_data: 'change_role' }]]
            }
          });
        }
        break;
      
      // Обработчики чата
      case data.startsWith('chat_with_') ? data : '':
        if (user) await handleChatWith(chatId, user, data.replace('chat_with_', ''));
        break;
      case data.startsWith('open_chat_') ? data : '':
        if (user) await handleOpenChat(chatId, user, data.replace('open_chat_', ''));
        break;
      
      // Обработчики создания уроков
      case 'quick_lesson':
        if (user) await handleQuickLesson(chatId, user);
        break;
      case 'detailed_lesson':
        if (user) await handleDetailedLesson(chatId, user);
        break;
      case 'my_lessons':
        if (user) await handleMyLessons(chatId, user);
        break;
      
      // Обработчики создания квизов
      case 'quick_quiz':
        if (user) await handleQuickQuiz(chatId, user);
        break;
      case 'detailed_quiz':
        if (user) await handleDetailedQuiz(chatId, user);
        break;
      case 'my_quizzes':
        if (user) await handleMyQuizzes(chatId, user);
        break;
      
      // Обработчики материалов
      case 'upload_material':
        if (user) await handleUploadMaterial(chatId, user);
        break;
      case 'my_materials':
        if (user) await handleMyMaterials(chatId, user);
        break;
      case 'materials_stats':
        if (user) await handleMaterialsStats(chatId, user);
        break;
      
      // Обработчики игры Эрудит
      case 'create_erudit':
        if (user) await handleCreateErudit(chatId, user);
        break;
      case 'my_erudit_games':
        if (user) await handleMyEruditGames(chatId, user);
        break;
      case 'erudit_leaderboard':
        if (user) await handleEruditLeaderboard(chatId, user);
        break;
      case 'erudit_rules':
        if (user) await handleEruditRules(chatId, user);
        break;
      
      // Обработчики аналитики
      case 'detailed_analytics':
        if (user) await handleDetailedAnalytics(chatId, user);
        break;
      case 'students_analytics':
        if (user) await handleStudentsAnalytics(chatId, user);
        break;
      case 'lessons_analytics':
        if (user) await handleLessonsAnalytics(chatId, user);
        break;
      
      // Обработчики управления пользователями (только для админов)
      case 'manage_students':
        if (user && isAuthorizedAdmin(user.telegramId)) await handleManageStudents(chatId, user);
        break;
      case 'manage_tutors':
        if (user && isAuthorizedAdmin(user.telegramId)) await handleManageTutors(chatId, user);
        break;
      case 'manage_blocked':
        if (user && isAuthorizedAdmin(user.telegramId)) await handleManageBlocked(chatId, user);
        break;
      case 'assign_tutor':
        if (user && isAuthorizedAdmin(user.telegramId)) await handleAssignTutor(chatId, user);
        break;
      
      // Обработчики настроек пользователя
      case 'notification_prefs':
        if (user) await handleNotificationPrefs(chatId, user);
        break;
      case 'language_settings':
        if (user) await handleLanguageSettings(chatId, user);
        break;
      case 'my_statistics':
        if (user) await handleMyStatistics(chatId, user);
        break;
      
      // Детали пользователей для преподавателей
      case data.startsWith('student_details_') ? data : '':
        if (user) await handleStudentDetails(chatId, user, data.replace('student_details_', ''));
        break;
      
      // Детали уроков и игр
      case data.startsWith('lesson_') ? data : '':
        if (user) await handleLessonDetails(chatId, user, data.replace('lesson_', ''));
        break;
      case data.startsWith('game_') ? data : '':
        if (user) await handleGameDetails(chatId, user, data.replace('game_', ''));
        break;
        
      case 'back_to_menu':
        if (user) await sendMainMenu(chatId, user);
        break;
      default:
        // Игнорируем неизвестные команды
        break;
    }
  } catch (error) {
    console.error('Ошибка при обработке callback:', error);
    // Не отправляем сообщения об ошибках для старых callback запросов
  }
});

// Обработчик для функции "Уроки"
async function handleLessons(chatId: number, user: BotUser) {
  try {
    const lessons = await storage.getLessons();
    const publishedLessons = lessons.filter(lesson => lesson.isPublished);
    
    if (publishedLessons.length === 0) {
      await bot!.sendMessage(chatId, 'Пока нет доступных уроков.', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        }
      });
      return;
    }
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: []
    };
    
    publishedLessons.forEach(lesson => {
      keyboard.inline_keyboard.push([{
        text: `📚 ${lesson.title} (${lesson.difficulty})`,
        callback_data: `lesson_${lesson.id}`
      }]);
    });
    
    keyboard.inline_keyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]);
    
    await bot!.sendMessage(chatId, '📚 Доступные уроки:', {
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Ошибка при получении уроков:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке уроков.');
  }
}

// Обработчик для функции "Игры"
async function handleGames(chatId: number, user: BotUser) {
  try {
    const games = await storage.getGames();
    const activeGames = games.filter(game => game.isActive);
    
    if (activeGames.length === 0) {
      await bot!.sendMessage(chatId, 'Пока нет доступных игр.', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        }
      });
      return;
    }
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: []
    };
    
    activeGames.forEach(game => {
      const gameEmoji = getGameEmoji(game.type);
      keyboard.inline_keyboard.push([{
        text: `${gameEmoji} ${game.title} (${game.difficulty})`,
        callback_data: `game_${game.id}`
      }]);
    });
    
    keyboard.inline_keyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]);
    
    await bot!.sendMessage(chatId, '🎮 Доступные игры:', {
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Ошибка при получении игр:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке игр.');
  }
}

// Функция для получения эмодзи игры
function getGameEmoji(gameType: string): string {
  const emojiMap: { [key: string]: string } = {
    'word_memory': '🧠',
    'grammar_builder': '📝',
    'pronunciation': '🗣️',
    'speed_reading': '⚡',
    'culture_quiz': '🏛️',
    'erudit': '🎯'
  };
  return emojiMap[gameType] || '🎮';
}

// Обработчик для чата
async function handleChat(chatId: number, user: BotUser) {
  try {
    if (user.role === 'student') {
      // Показываем список доступных преподавателей
      const tutors = await storage.getUsersByRole('tutor');
      const activeTutors = tutors.filter(t => t.isOnline);
      
      if (activeTutors.length === 0) {
        await bot!.sendMessage(chatId, '👨‍🏫 Сейчас нет доступных преподавателей онлайн.\n\nПопробуйте позже или оставьте сообщение.', {
          reply_markup: {
            inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
          }
        });
        return;
      }
      
      const keyboard: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: []
      };
      
      activeTutors.forEach(tutor => {
        keyboard.inline_keyboard.push([{
          text: `💬 ${tutor.firstName} ${tutor.lastName} 🟢`,
          callback_data: `chat_with_${tutor.id}`
        }]);
      });
      
      keyboard.inline_keyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]);
      
      await bot!.sendMessage(chatId, '👨‍🏫 <b>Выберите преподавателя для чата:</b>\n\n🟢 - сейчас онлайн', {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
      
    } else if (user.role === 'tutor') {
      // Показываем активные чаты преподавателя
      const chats = await storage.getChatsByUser(user.id);
      
      if (chats.length === 0) {
        await bot!.sendMessage(chatId, '💬 У вас пока нет активных чатов со студентами.', {
          reply_markup: {
            inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
          }
        });
        return;
      }
      
      const keyboard: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: []
      };
      
      for (const chat of chats) {
        const student = await storage.getUser(chat.studentId);
        if (student) {
          const unreadCount = await getUnreadMessagesCount(chat.id, user.id);
          const unreadText = unreadCount > 0 ? ` (${unreadCount})` : '';
          keyboard.inline_keyboard.push([{
            text: `💬 ${student.firstName} ${student.lastName}${unreadText}`,
            callback_data: `open_chat_${chat.id}`
          }]);
        }
      }
      
      keyboard.inline_keyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]);
      
      await bot!.sendMessage(chatId, '💬 <b>Ваши чаты со студентами:</b>', {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    }
  } catch (error) {
    console.error('Ошибка при обработке чата:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке чатов.');
  }
}

// Остальные обработчики (достижения, прогресс, таблица лидеров)
async function handleAchievements(chatId: number, user: BotUser) {
  try {
    const userAchievements = await storage.getUserAchievements(user.id);
    
    if (userAchievements.length === 0) {
      await bot!.sendMessage(chatId, '🏆 У вас пока нет достижений.\nПродолжайте учиться, чтобы получить первые награды!', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        }
      });
      return;
    }

    // Получаем детали достижений
    const achievements = await storage.getAchievements();
    let message = '🏆 Ваши достижения:\n\n';
    
    userAchievements.forEach((userAchievement, index) => {
      const achievement = achievements.find(a => a.id === userAchievement.achievementId);
      if (achievement) {
        message += `${index + 1}. ${achievement.title} ${achievement.icon}\n   ${achievement.description}\n\n`;
      }
    });
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      }
    });
  } catch (error) {
    console.error('Ошибка при получении достижений:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке достижений.');
  }
}

async function handleProgress(chatId: number, user: BotUser) {
  try {
    const userData = await storage.getUser(user.id);
    const userProgress = await storage.getUserProgressByUser(user.id);
    
    if (!userData) {
      await bot!.sendMessage(chatId, 'Ошибка при загрузке данных пользователя.');
      return;
    }
    
    const completedLessons = userProgress.filter(p => p.completed).length;
    const totalLessons = (await storage.getLessons()).filter(l => l.isPublished).length;
    const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    
    const message = `📊 Ваш прогресс:\n\n` +
                   `🎯 Уровень: ${userData.level}\n` +
                   `✨ Опыт: ${userData.experience} XP\n` +
                   `🔥 Стрик: ${userData.streak} дней\n` +
                   `📚 Уроков завершено: ${completedLessons}/${totalLessons} (${completionPercentage}%)\n\n` +
                   `Продолжайте учиться для получения новых уровней!`;
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      }
    });
  } catch (error) {
    console.error('Ошибка при получении прогресса:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке прогресса.');
  }
}

async function handleLeaderboard(chatId: number, user: BotUser) {
  try {
    const users = await storage.getUsersByRole('student');
    const sortedUsers = users
      .filter(u => (u.experience || 0) > 0)
      .sort((a, b) => (b.experience || 0) - (a.experience || 0))
      .slice(0, 10);
    
    if (sortedUsers.length === 0) {
      await bot!.sendMessage(chatId, '🏅 Таблица лидеров пока пуста.\nСтаньте первым!', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        }
      });
      return;
    }
    
    let message = '🏅 Таблица лидеров:\n\n';
    sortedUsers.forEach((userData, index) => {
      const position = index + 1;
      const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
      message += `${medal} ${userData.firstName} ${userData.lastName} - ${userData.experience} XP (ур. ${userData.level})\n`;
    });
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
      }
    });
  } catch (error) {
    console.error('Ошибка при получении таблицы лидеров:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке таблицы лидеров.');
  }
}

// Обработчики для преподавателей
async function handleMyStudents(chatId: number, user: BotUser) {
  try {
    const tutorStudents = await storage.getTutorStudents(user.id);
    
    if (tutorStudents.length === 0) {
      await bot!.sendMessage(chatId, '👥 У вас пока нет назначенных студентов.\n\nОбратитесь к администратору для назначения студентов.', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]]
        }
      });
      return;
    }
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: []
    };
    
    let message = '👥 <b>Ваши студенты:</b>\n\n';
    
    for (const assignment of tutorStudents) {
      const student = await storage.getUser(assignment.studentId);
      if (student) {
        const onlineStatus = student.isOnline ? '🟢' : '🔴';
        const lastActivity = student.lastActivity ? 
          new Date(student.lastActivity).toLocaleDateString('ru-RU') : 'никогда';
        
        message += `${onlineStatus} <b>${student.firstName} ${student.lastName}</b>\n`;
        message += `   📊 Уровень: ${student.level} | XP: ${student.experience}\n`;
        message += `   📅 Последняя активность: ${lastActivity}\n\n`;
        
        keyboard.inline_keyboard.push([{
          text: `👤 ${student.firstName} ${student.lastName}`,
          callback_data: `student_details_${student.id}`
        }]);
      }
    }
    
    keyboard.inline_keyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]);
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при получении студентов:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке списка студентов.');
  }
}

async function handleCreateLesson(chatId: number, user: BotUser) {
  try {
    // Показываем меню создания урока
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '📝 Быстрый урок', callback_data: 'quick_lesson' }],
        [{ text: '📚 Подробный урок', callback_data: 'detailed_lesson' }],
        [{ text: '📋 Мои уроки', callback_data: 'my_lessons' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };
    
    const message = '📚 <b>Создание урока</b>\n\n' +
                   '📝 <b>Быстрый урок</b> - простой урок с текстом\n' +
                   '📚 <b>Подробный урок</b> - урок с заданиями и медиа\n' +
                   '📋 <b>Мои уроки</b> - управление созданными уроками';
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при создании урока:', error);
    await bot!.sendMessage(chatId, 'Ошибка при создании урока.');
  }
}

async function handleCreateQuiz(chatId: number, user: BotUser) {
  try {
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '⚡ Быстрый квиз', callback_data: 'quick_quiz' }],
        [{ text: '🎯 Подробный квиз', callback_data: 'detailed_quiz' }],
        [{ text: '📊 Мои квизы', callback_data: 'my_quizzes' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };
    
    const message = '📝 <b>Создание квиза</b>\n\n' +
                   '⚡ <b>Быстрый квиз</b> - 5 вопросов с выбором ответа\n' +
                   '🎯 <b>Подробный квиз</b> - настраиваемый квиз\n' +
                   '📊 <b>Мои квизы</b> - управление созданными квизами';
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при создании квиза:', error);
    await bot!.sendMessage(chatId, 'Ошибка при создании квиза.');
  }
}

async function handleMaterials(chatId: number, user: BotUser) {
  try {
    const materials = await storage.getTheoryMaterials({ authorId: user.id });
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '📎 Загрузить материал', callback_data: 'upload_material' }],
        [{ text: '📚 Мои материалы', callback_data: 'my_materials' }],
        [{ text: '📊 Статистика просмотров', callback_data: 'materials_stats' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };
    
    let message = '📁 <b>Управление материалами</b>\n\n';
    message += `📚 Всего материалов: <b>${materials.length}</b>\n`;
    
    if (materials.length > 0) {
      const totalViews = materials.reduce((sum, m) => sum + (m.viewCount || 0), 0);
      const totalDownloads = materials.reduce((sum, m) => sum + (m.downloadCount || 0), 0);
      message += `👀 Всего просмотров: <b>${totalViews}</b>\n`;
      message += `⬇️ Всего загрузок: <b>${totalDownloads}</b>\n`;
    }
    
    message += '\n💡 <i>Выберите действие:</i>';
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при управлении материалами:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке материалов.');
  }
}

async function handleEruditGame(chatId: number, user: BotUser) {
  try {
    const sessions = await storage.getEruditSessions({ hostId: user.id });
    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'waiting');
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '🆕 Создать игру', callback_data: 'create_erudit' }],
        [{ text: '🎮 Мои игры', callback_data: 'my_erudit_games' }],
        [{ text: '🏆 Рейтинг игроков', callback_data: 'erudit_leaderboard' }],
        [{ text: '📋 Правила игры', callback_data: 'erudit_rules' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };
    
    let message = '🎯 <b>Игра ЭРУДИТ</b>\n\n';
    message += `🎮 Активных игр: <b>${activeSessions.length}</b>\n`;
    message += `📈 Всего создано: <b>${sessions.length}</b>\n\n`;
    message += '💡 <i>Выберите действие:</i>';
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при запуске Эрудит:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке игры Эрудит.');
  }
}

async function handleAnalytics(chatId: number, user: BotUser) {
  try {
    const tutorStudents = await storage.getTutorStudents(user.id);
    const lessons = await storage.getLessons({ authorId: user.id });
    const quizzes = await storage.getQuizzes({ authorId: user.id });
    
    let totalProgress = 0;
    let completedLessons = 0;
    let activeStudents = 0;
    
    for (const assignment of tutorStudents) {
      const student = await storage.getUser(assignment.studentId);
      if (student) {
        if (student.isOnline) activeStudents++;
        
        const progress = await storage.getUserProgressByUser(assignment.studentId);
        totalProgress += progress.length;
        completedLessons += progress.filter(p => p.completed).length;
      }
    }
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '📊 Детальная статистика', callback_data: 'detailed_analytics' }],
        [{ text: '👥 Анализ студентов', callback_data: 'students_analytics' }],
        [{ text: '📚 Статистика уроков', callback_data: 'lessons_analytics' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };
    
    let message = '📊 <b>АНАЛИТИКА ПРЕПОДАВАТЕЛЯ</b>\n';
    message += `═══════════════════════\n\n`;
    message += `👥 <b>Студенты:</b>\n`;
    message += `   📈 Всего: <b>${tutorStudents.length}</b>\n`;
    message += `   🟢 Активных: <b>${activeStudents}</b>\n\n`;
    message += `📚 <b>Контент:</b>\n`;
    message += `   📖 Уроков создано: <b>${lessons.length}</b>\n`;
    message += `   📝 Квизов создано: <b>${quizzes.length}</b>\n\n`;
    message += `🎯 <b>Прогресс:</b>\n`;
    message += `   ✅ Уроков завершено: <b>${completedLessons}</b>\n`;
    message += `   📊 Общий прогресс: <b>${totalProgress}</b>\n\n`;
    message += `📅 <i>Обновлено: ${new Date().toLocaleString('ru-RU')}</i>`;
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при получении аналитики:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке аналитики.');
  }
}

// Обработчики для администраторов
async function handleManageUsers(chatId: number, user: BotUser) {
  try {
    // Проверяем права админа
    if (!isAuthorizedAdmin(user.telegramId)) {
      await bot!.sendMessage(chatId, '🙅 Доступ запрещен! Только авторизованные администраторы.');
      return;
    }
    
    const students = await storage.getUsersByRole('student');
    const tutors = await storage.getUsersByRole('tutor');
    const admins = await storage.getUsersByRole('admin');
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '🎓 Студенты', callback_data: 'manage_students' }],
        [{ text: '👨‍🏫 Преподаватели', callback_data: 'manage_tutors' }],
        [{ text: '🔒 Заблокированные', callback_data: 'manage_blocked' }],
        [{ text: '🔗 Назначить преподавателя', callback_data: 'assign_tutor' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };
    
    let message = '👥 <b>УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ</b>\n';
    message += `═════════════════════════\n\n`;
    message += `🎓 <b>Студенты:</b> ${students.length}\n`;
    message += `👨‍🏫 <b>Преподаватели:</b> ${tutors.length}\n`;
    message += `🔧 <b>Администраторы:</b> ${admins.length}\n\n`;
    
    const onlineUsers = [...students, ...tutors, ...admins].filter(u => u.isOnline).length;
    message += `🟢 <b>Онлайн сейчас:</b> ${onlineUsers}\n\n`;
    message += '💡 <i>Выберите действие:</i>';
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при управлении пользователями:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке данных пользователей.');
  }
}

async function handleSystemStats(chatId: number, user: BotUser) {
  try {
    const students = await storage.getUsersByRole('student');
    const tutors = await storage.getUsersByRole('tutor');
    const admins = await storage.getUsersByRole('admin');
    const lessons = await storage.getLessons();
    const games = await storage.getGames();
    
    const studentsCount = students.length;
    const tutorsCount = tutors.length;
    const adminsCount = admins.length;
    const allUsers = [...students, ...tutors, ...admins];
    const onlineUsers = allUsers.filter(u => u.isOnline).length;
    const activeStudents = students.filter(s => s.lastActivity && 
      new Date(s.lastActivity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
    
    let message = `📊 <b>СИСТЕМНАЯ СТАТИСТИКА</b>\n`;
    message += `═══════════════════════\n\n`;
    message += `👥 <b>Пользователи:</b>\n`;
    message += `   🎓 Студенты: <b>${studentsCount}</b>\n`;
    message += `   👨‍🏫 Преподаватели: <b>${tutorsCount}</b>\n`;
    message += `   🛠️ Администраторы: <b>${adminsCount}</b>\n`;
    message += `   🟢 Онлайн сейчас: <b>${onlineUsers}</b>\n`;
    message += `   📈 Активные за неделю: <b>${activeStudents}</b>\n\n`;
    message += `📚 <b>Контент:</b>\n`;
    message += `   📖 Уроки: <b>${lessons.length}</b>\n`;
    message += `   🎮 Игры: <b>${games.length}</b>\n\n`;
    message += `📅 <i>Обновлено: ${new Date().toLocaleString('ru-RU')}</i>`;
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Обновить', callback_data: 'system_stats' }],
          [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
        ]
      },
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    await bot!.sendMessage(chatId, '❌ Ошибка при загрузке статистики. Попробуйте позже.');
  }
}

async function handleManageContent(chatId: number, user: BotUser) {
  try {
    // Проверяем права админа
    if (!isAuthorizedAdmin(user.telegramId)) {
      await bot!.sendMessage(chatId, '🙅 Доступ запрещен! Только авторизованные администраторы.');
      return;
    }
    
    const lessons = await storage.getLessons();
    const quizzes = await storage.getQuizzes();
    const games = await storage.getGames();
    const materials = await storage.getTheoryMaterials();
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '📚 Управление уроками', callback_data: 'admin_lessons' }],
        [{ text: '📝 Управление квизами', callback_data: 'admin_quizzes' }],
        [{ text: '🎮 Управление играми', callback_data: 'admin_games' }],
        [{ text: '📁 Управление материалами', callback_data: 'admin_materials' }],
        [{ text: '📊 Статистика контента', callback_data: 'content_stats' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };
    
    let message = '📁 <b>УПРАВЛЕНИЕ КОНТЕНТОМ</b>\n';
    message += `══════════════════════\n\n`;
    message += `📚 <b>Уроки:</b> ${lessons.length} (опубликовано: ${lessons.filter(l => l.isPublished).length})\n`;
    message += `📝 <b>Квизы:</b> ${quizzes.length}\n`;
    message += `🎮 <b>Игры:</b> ${games.length} (активные: ${games.filter(g => g.isActive).length})\n`;
    message += `📁 <b>Материалы:</b> ${materials.length}\n\n`;
    
    const totalViews = materials.reduce((sum, m) => sum + (m.viewCount || 0), 0);
    message += `👀 <b>Общих просмотров:</b> ${totalViews}\n\n`;
    message += '💡 <i>Выберите категорию для управления:</i>';
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при управлении контентом:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке данных контента.');
  }
}

async function handleSystemSettings(chatId: number, user: BotUser) {
  try {
    // Проверяем права админа
    if (!isAuthorizedAdmin(user.telegramId)) {
      await bot!.sendMessage(chatId, '🙅 Доступ запрещен! Только авторизованные администраторы.');
      return;
    }
    
    const settings = await storage.getSystemSettings();
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '🌐 Общие настройки', callback_data: 'general_settings' }],
        [{ text: '👥 Пользовательские настройки', callback_data: 'user_settings' }],
        [{ text: '📚 Настройки обучения', callback_data: 'learning_settings' }],
        [{ text: '🔔 Настройки уведомлений', callback_data: 'notification_settings' }],
        [{ text: '⚙️ Изменить настройку', callback_data: 'edit_setting' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };
    
    let message = '⚙️ <b>СИСТЕМНЫЕ НАСТРОЙКИ</b>\n';
    message += `═══════════════════════\n\n`;
    
    if (settings.length === 0) {
      message += 'ℹ️ Настройки по умолчанию. Настройки можно изменить через меню.\n\n';
    } else {
      message += '📊 <b>Текущие настройки:</b>\n\n';
      settings.slice(0, 5).forEach(setting => {
        message += `• <b>${setting.key}:</b> ${setting.value}\n`;
      });
      if (settings.length > 5) {
        message += `… и еще ${settings.length - 5} настроек\n`;
      }
      message += '\n';
    }
    
    message += '💡 <i>Выберите категорию настроек:</i>';
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при загрузке настроек:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке системных настроек.');
  }
}

async function handleAdminLogs(chatId: number, user: BotUser) {
  try {
    // Проверяем права админа
    if (!isAuthorizedAdmin(user.telegramId)) {
      await bot!.sendMessage(chatId, '🙅 Доступ запрещен! Только авторизованные администраторы.');
      return;
    }
    
    const logs = await storage.getAdminLogs(user.id, 10);
    const allLogs = await storage.getAdminLogs(undefined, 50);
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '📊 Мои действия', callback_data: 'my_admin_logs' }],
        [{ text: '📋 Все действия', callback_data: 'all_admin_logs' }],
        [{ text: '🔄 Обновить', callback_data: 'admin_logs' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };
    
    let message = '📋 <b>ЛОГИ АДМИНИСТРАТОРА</b>\n';
    message += `════════════════════════\n\n`;
    
    if (allLogs.length === 0) {
      message += 'ℹ️ Пока нет записей в логах.\n\n';
    } else {
      message += `📊 <b>Последние 5 действий:</b>\n\n`;
      
      allLogs.slice(0, 5).forEach((log, index) => {
        const date = new Date(log.createdAt).toLocaleString('ru-RU');
        message += `${index + 1}. <b>${log.action}</b>\n`;
        message += `   👤 Админ ID: ${log.adminId}\n`;
        message += `   📅 ${date}\n`;
        if (log.details) {
          message += `   📝 ${log.details}\n`;
        }
        message += '\n';
      });
      
      message += `📊 Всего записей: <b>${allLogs.length}</b>\n\n`;
    }
    
    message += '💡 <i>Выберите действие:</i>';
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при загрузке логов:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке логов администратора.');
  }
}

// Обработчик смены роли
async function handleChangeRole(chatId: number, user: BotUser) {
  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [ROLE_SELECTION[0], ROLE_SELECTION[1]],
      [ROLE_SELECTION[2]],
      [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
    ]
  };
  
  const message = `🔄 Смена роли\n\n` +
                 `Текущая роль: ${getRoleText(user.role)}\n\n` +
                 `Выберите новую роль:`;
  
  await bot!.sendMessage(chatId, message, {
    reply_markup: keyboard
  });
}

// Обработчик выбора роли
async function handleSelectRole(chatId: number, telegramUser: TelegramBot.User, newRole: 'student' | 'tutor' | 'admin') {
  const telegramId = telegramUser.id.toString();
  
  try {
    // Дополнительная проверка для админ роли
    if (newRole === 'admin' && !isAuthorizedAdmin(telegramId)) {
      await bot!.sendMessage(chatId, '🚫 <b>Доступ запрещен!</b>\n\nТолько авторизованные пользователи могут получить роль администратора.', {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Назад к выбору роли', callback_data: 'change_role' }]]
        }
      });
      return;
    }
    
    // Проверяем, есть ли уже пользователь
    let user = await storage.getUserByTelegramId(telegramId);
    
    if (user) {
      // Обновляем роль существующего пользователя
      await storage.updateUser(user.id, { role: newRole });
    } else {
      // Создаем нового пользователя с выбранной ролью
      const newUser = {
        username: telegramUser.username || `user_${telegramId}`,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name || '',
        role: newRole,
        telegramId: telegramId,
        telegramUsername: telegramUser.username,
        telegramChatId: chatId.toString(),
        telegramAuthDate: new Date(),
        level: 1,
        experience: 0,
        streak: 0,
        isOnline: true
      };
      
      user = await storage.createUser(newUser);
    }
    
    // Обновляем данные в активных пользователях
    const botUser: BotUser = {
      id: user.id,
      telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: newRole
    };
    
    activeBotUsers.set(telegramId, botUser);
    
    const roleText = getRoleText(newRole);
    
    let successMessage = `✅ <b>Роль успешно изменена!</b>\n\n`;
    successMessage += `🎯 <b>Новая роль:</b> ${roleText}\n`;
    
    if (newRole === 'admin') {
      successMessage += `\n🛠️ <b>Добро пожаловать в админ панель!</b>\n`;
      successMessage += `Вам доступны все функции управления системой:\n`;
      successMessage += `• Управление пользователями\n`;
      successMessage += `• Системная статистика\n`;
      successMessage += `• Управление контентом\n`;
      successMessage += `• Системные настройки\n`;
      successMessage += `• Журнал действий\n`;
    }
    
    await bot!.sendMessage(chatId, successMessage, { parse_mode: 'HTML' });
    
    // Показываем главное меню с новой ролью
    await sendMainMenu(chatId, botUser);
    
  } catch (error) {
    console.error('Ошибка при смене роли:', error);
    await bot!.sendMessage(chatId, '❌ Произошла ошибка при смене роли. Попробуйте еще раз.');
  }
}

// Функция для получения текста роли
function getRoleText(role: string): string {
  switch (role) {
    case 'student': return '🎓 Студент';
    case 'tutor': return '👨‍🏫 Преподаватель';  
    case 'admin': return '🛠️ Администратор';
    default: return role;
  }
}

async function handleSettings(chatId: number, user: BotUser) {
  try {
    const userData = await storage.getUser(user.id);
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '🔄 Сменить роль', callback_data: 'change_role' }],
        [{ text: '🔔 Настройки уведомлений', callback_data: 'notification_prefs' }],
        [{ text: '🌍 Язык и регион', callback_data: 'language_settings' }],
        [{ text: '📊 Моя статистика', callback_data: 'my_statistics' }],
        [{ text: '🔙 Назад в меню', callback_data: 'back_to_menu' }]
      ]
    };
    
    let message = `⚙️ <b>НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ</b>\n`;
    message += `═══════════════════════\n\n`;
    message += `👤 <b>Имя:</b> ${user.firstName} ${user.lastName}\n`;
    message += `🎭 <b>Роль:</b> ${getRoleText(user.role)}\n`;
    message += `🆔 <b>Telegram ID:</b> ${user.telegramId}\n`;
    
    if (userData) {
      message += `🔥 <b>Уровень:</b> ${userData.level}\n`;
      message += `✨ <b>Опыт:</b> ${userData.experience} XP\n`;
      message += `🔥 <b>Стрик:</b> ${userData.streak} дней\n`;
      
      const lastActivity = userData.lastActivity ? 
        new Date(userData.lastActivity).toLocaleString('ru-RU') : 'никогда';
      message += `📅 <b>Последняя активность:</b> ${lastActivity}\n`;
    }
    
    message += '\n💡 <i>Выберите настройку для изменения:</i>';
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при загрузке настроек:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке настроек пользователя.');
  }
}

// Основные обработчики новой функциональности

// Обработчики чата
async function handleChatWith(chatId: number, user: BotUser, tutorId: string) {
  try {
    // Получаем или создаем чат
    let chat = await storage.getChatByUsers(user.id, tutorId);
    if (!chat) {
      chat = await storage.createChat({
        studentId: user.id,
        tutorId: tutorId
      });
    }
    
    const tutor = await storage.getUser(tutorId);
    if (!tutor) {
      await bot!.sendMessage(chatId, 'Преподаватель не найден.');
      return;
    }
    
    await bot!.sendMessage(chatId, `💬 Чат с <b>${tutor.firstName} ${tutor.lastName}</b>\n\n💡 Напишите сообщение следующим сообщением:`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Назад к списку преподавателей', callback_data: 'chat' }]]
      }
    });
    
    // Отмечаем, что пользователь ожидает ввод сообщения
    const botUser = activeBotUsers.get(user.telegramId);
    if (botUser) {
      botUser.awaitingInput = `chat_message_${chat.id}`;
    }
  } catch (error) {
    console.error('Ошибка при открытии чата:', error);
    await bot!.sendMessage(chatId, 'Ошибка при открытии чата.');
  }
}

async function handleOpenChat(chatId: number, user: BotUser, chatSessionId: string) {
  try {
    const messages = await storage.getMessagesByChat(chatSessionId, 20);
    let messageText = '💬 <b>Последние сообщения:</b>\n\n';
    
    if (messages.length === 0) {
      messageText += 'ℹ️ Пока нет сообщений в этом чате.';
    } else {
      for (const message of messages.slice(-10)) {
        const sender = await storage.getUser(message.senderId);
        const time = new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        messageText += `[${time}] <b>${sender?.firstName}:</b> ${message.content}\n`;
      }
    }
    
    messageText += '\n💡 Напишите сообщение следующим сообщением:';
    
    await bot!.sendMessage(chatId, messageText, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Назад к чатам', callback_data: 'chat' }]]
      }
    });
    
    // Отмечаем, что пользователь ожидает ввод сообщения
    const botUser = activeBotUsers.get(user.telegramId);
    if (botUser) {
      botUser.awaitingInput = `chat_message_${chatSessionId}`;
    }
  } catch (error) {
    console.error('Ошибка при открытии чата:', error);
    await bot!.sendMessage(chatId, 'Ошибка при открытии чата.');
  }
}

// Обработчики быстрого создания
async function handleQuickLesson(chatId: number, user: BotUser) {
  await bot!.sendMessage(chatId, '📝 <b>Быстрое создание урока</b>\n\n💡 Отправьте следующим сообщением название урока:', {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'create_lesson' }]]
    }
  });
  
  // Отмечаем, что пользователь ожидает ввод
  const botUser = activeBotUsers.get(user.telegramId);
  if (botUser) {
    botUser.awaitingInput = 'quick_lesson_title';
  }
}

async function handleQuickQuiz(chatId: number, user: BotUser) {
  await bot!.sendMessage(chatId, '⚡ <b>Быстрое создание квиза</b>\n\n💡 Отправьте следующим сообщением название квиза:', {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'create_quiz' }]]
    }
  });
  
  const botUser = activeBotUsers.get(user.telegramId);
  if (botUser) {
    botUser.awaitingInput = 'quick_quiz_title';
  }
}

// Обработчики списков
async function handleMyLessons(chatId: number, user: BotUser) {
  try {
    const lessons = await storage.getLessons({ authorId: user.id });
    
    if (lessons.length === 0) {
      await bot!.sendMessage(chatId, '📚 У вас пока нет созданных уроков.', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'create_lesson' }]]
        }
      });
      return;
    }
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: []
    };
    
    lessons.forEach(lesson => {
      const status = lesson.isPublished ? '🟢' : '🔴';
      keyboard.inline_keyboard.push([{
        text: `${status} ${lesson.title} (${lesson.difficulty})`,
        callback_data: `lesson_${lesson.id}`
      }]);
    });
    
    keyboard.inline_keyboard.push([{ text: '🔙 Назад', callback_data: 'create_lesson' }]);
    
    await bot!.sendMessage(chatId, '📚 <b>Ваши уроки:</b>\n\n🟢 - опубликован\n🔴 - черновик', {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при получении уроков:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке списка уроков.');
  }
}

async function handleMyQuizzes(chatId: number, user: BotUser) {
  try {
    const quizzes = await storage.getQuizzes({ authorId: user.id });
    
    if (quizzes.length === 0) {
      await bot!.sendMessage(chatId, '📝 У вас пока нет созданных квизов.', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'create_quiz' }]]
        }
      });
      return;
    }
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: []
    };
    
    quizzes.forEach(quiz => {
      keyboard.inline_keyboard.push([{
        text: `📝 ${quiz.title} (${quiz.difficulty})`,
        callback_data: `quiz_${quiz.id}`
      }]);
    });
    
    keyboard.inline_keyboard.push([{ text: '🔙 Назад', callback_data: 'create_quiz' }]);
    
    await bot!.sendMessage(chatId, '📝 <b>Ваши квизы:</b>', {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при получении квизов:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке списка квизов.');
  }
}

// Обработчик деталей студента
async function handleStudentDetails(chatId: number, user: BotUser, studentId: string) {
  try {
    const student = await storage.getUser(studentId);
    if (!student) {
      await bot!.sendMessage(chatId, 'Студент не найден.');
      return;
    }
    
    const progress = await storage.getUserProgressByUser(studentId);
    const completedLessons = progress.filter(p => p.completed).length;
    const achievements = await storage.getUserAchievements(studentId);
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '💬 Открыть чат', callback_data: `chat_with_${studentId}` }],
        [{ text: '📊 Подробный прогресс', callback_data: `student_progress_${studentId}` }],
        [{ text: '🔙 Назад к списку', callback_data: 'my_students' }]
      ]
    };
    
    let message = `👤 <b>Информация о студенте</b>\n`;
    message += `══════════════════════\n\n`;
    message += `👤 <b>Имя:</b> ${student.firstName} ${student.lastName}\n`;
    message += `🔥 <b>Уровень:</b> ${student.level}\n`;
    message += `✨ <b>Опыт:</b> ${student.experience} XP\n`;
    message += `🔥 <b>Стрик:</b> ${student.streak} дней\n`;
    message += `✅ <b>Завершено уроков:</b> ${completedLessons}\n`;
    message += `🏆 <b>Достижений:</b> ${achievements.length}\n\n`;
    
    const status = student.isOnline ? '🟢 Онлайн' : '🔴 Офлайн';
    message += `📶 <b>Статус:</b> ${status}`;
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при получении деталей студента:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке информации о студенте.');
  }
}

// Обработчик деталей урока
async function handleLessonDetails(chatId: number, user: BotUser, lessonId: string) {
  try {
    const lesson = await storage.getLesson(lessonId);
    if (!lesson) {
      await bot!.sendMessage(chatId, 'Урок не найден.');
      return;
    }
    
    let message = `📚 <b>${lesson.title}</b>\n\n`;
    message += `🎯 <b>Сложность:</b> ${lesson.difficulty}\n`;
    message += `📊 <b>Категория:</b> ${lesson.category}\n\n`;
    
    if (lesson.description) {
      message += `📝 <b>Описание:</b>\n${lesson.description}\n\n`;
    }
    
    // Показываем контент урока (ограниченно)
    if (lesson.content) {
      const shortContent = lesson.content.length > 200 ? 
        lesson.content.substring(0, 200) + '...' : lesson.content;
      message += `📄 <b>Контент:</b>\n${shortContent}`;
    }
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: []
    };
    
    if (user.role === 'student') {
      keyboard.inline_keyboard.push([{ text: '🏁 Начать урок', callback_data: `start_lesson_${lessonId}` }]);
      keyboard.inline_keyboard.push([{ text: '🔙 Назад к списку', callback_data: 'lessons' }]);
    } else {
      keyboard.inline_keyboard.push([{ text: '✏️ Редактировать', callback_data: `edit_lesson_${lessonId}` }]);
      keyboard.inline_keyboard.push([{ text: '🔙 Назад', callback_data: 'my_lessons' }]);
    }
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при получении деталей урока:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке урока.');
  }
}

// Обработчик деталей игры
async function handleGameDetails(chatId: number, user: BotUser, gameId: string) {
  try {
    const game = await storage.getGame(gameId);
    if (!game) {
      await bot!.sendMessage(chatId, 'Игра не найдена.');
      return;
    }
    
    const gameEmoji = getGameEmoji(game.type);
    let message = `${gameEmoji} <b>${game.title}</b>\n\n`;
    message += `🎯 <b>Сложность:</b> ${game.difficulty}\n`;
    message += `🏆 <b>Макс. очки:</b> ${game.maxScore}\n\n`;
    
    if (game.description) {
      message += `📝 <b>Описание:</b>\n${game.description}`;
    }
    
    const keyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '🎮 Начать игру', callback_data: `start_game_${gameId}` }],
        [{ text: '🔙 Назад к списку', callback_data: 'games' }]
      ]
    };
    
    await bot!.sendMessage(chatId, message, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Ошибка при получении деталей игры:', error);
    await bot!.sendMessage(chatId, 'Ошибка при загрузке игры.');
  }
}

// Реализация списка материалов
async function handleMyMaterials(chatId: number, user: BotUser) {
  const materials = await storage.getTheoryMaterials({ authorId: user.id });
  
  let message = `📁 <b>Мои материалы</b>\n\n`;
  message += `📊 <b>Всего материалов:</b> ${materials.length}\n\n`;
  
  if (materials.length === 0) {
    message += `📭 У вас пока нет загруженных материалов\n\n`;
    message += `💡 <i>Загрузите свой первый материал!</i>`;
  } else {
    // Группируем по типам
    const byType = materials.reduce((acc: Record<string, number>, material: any) => {
      acc[material.type] = (acc[material.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    message += `📊 <b>По типам:</b>\n`;
    Object.entries(byType).forEach(([type, count]) => {
      const emoji = type === 'document' ? '📄' : type === 'image' ? '🖼️' : type === 'video' ? '🎥' : '🎵';
      message += `${emoji} ${type}: ${count}\n`;
    });

    message += `\n📚 <b>Последние материалы:</b>\n`;
    materials.slice(0, 5).forEach((material: any, index: number) => {
      const typeEmoji = material.type === 'document' ? '📄' : material.type === 'image' ? '🖼️' : material.type === 'video' ? '🎥' : '🎵';
      message += `${index + 1}. ${typeEmoji} ${material.title}\n`;
      message += `   Категория: ${material.category}\n`;
      message += `   Сложность: ${material.difficulty}\n\n`;
    });
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '📎 Загрузить материал', callback_data: 'upload_material' }],
      [{ text: '📊 Статистика', callback_data: 'materials_stats' }],
      [{ text: '🌐 Открыть веб-интерфейс', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/tutor` }],
      [{ text: '🔙 Назад', callback_data: 'materials' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация загрузки материала
async function handleUploadMaterial(chatId: number, user: BotUser) {
  let message = `📎 <b>Загрузка материала</b>\n\n`;
  message += `🔧 <b>Поддерживаемые форматы:</b>\n`;
  message += `📄 Документы: PDF, DOC, DOCX\n`;
  message += `🖼️ Изображения: JPG, PNG, GIF\n`;
  message += `🎥 Видео: MP4, AVI, MOV\n`;
  message += `🎵 Аудио: MP3, WAV, OGG\n\n`;
  message += `💡 <i>Для загрузки файлов используйте веб-интерфейс</i>\n\n`;
  message += `⚡ <b>Быстрая загрузка:</b>\n`;
  message += `Отправьте файл сюда, и я создам материал автоматически!`;

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🌐 Открыть загрузчик', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/tutor` }],
      [{ text: '📁 Мои материалы', callback_data: 'my_materials' }],
      [{ text: '🔙 Назад', callback_data: 'materials' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация статистики материалов
async function handleMaterialsStats(chatId: number, user: BotUser) {
  const materials = await storage.getTheoryMaterials({ authorId: user.id });
  
  let message = `📊 <b>Статистика материалов</b>\n\n`;
  
  if (materials.length === 0) {
    message += `📭 Статистики пока нет - нет материалов\n\n`;
    message += `💡 <i>Загрузите материалы для получения статистики!</i>`;
  } else {
    // Статистика по типам
    const byType = materials.reduce((acc: Record<string, number>, material: any) => {
      acc[material.type] = (acc[material.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Статистика по сложности
    const byDifficulty = materials.reduce((acc: Record<string, number>, material: any) => {
      acc[material.difficulty] = (acc[material.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Статистика по категориям
    const byCategory = materials.reduce((acc: Record<string, number>, material: any) => {
      acc[material.category] = (acc[material.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    message += `📈 <b>Общая статистика:</b>\n`;
    message += `• Всего материалов: ${materials.length}\n\n`;

    message += `📁 <b>По типам:</b>\n`;
    Object.entries(byType).forEach(([type, count]) => {
      const emoji = type === 'document' ? '📄' : type === 'image' ? '🖼️' : type === 'video' ? '🎥' : '🎵';
      message += `${emoji} ${type}: ${count}\n`;
    });

    message += `\n🎯 <b>По сложности:</b>\n`;
    Object.entries(byDifficulty).forEach(([difficulty, count]) => {
      const emoji = difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴';
      const label = difficulty === 'easy' ? 'Легкий' : difficulty === 'medium' ? 'Средний' : 'Сложный';
      message += `${emoji} ${label}: ${count}\n`;
    });

    message += `\n📚 <b>По категориям:</b>\n`;
    Object.entries(byCategory).slice(0, 5).forEach(([category, count]) => {
      message += `🔹 ${category}: ${count}\n`;
    });
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '📁 Мои материалы', callback_data: 'my_materials' }],
      [{ text: '📎 Загрузить материал', callback_data: 'upload_material' }],
      [{ text: '🔙 Назад', callback_data: 'materials' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Плейсхолдеры для остальных обработчиков (можно реализовать по необходимости)
// Остальные обработчики можно добавить по аналогии...

// Реализация детального создания урока
async function handleDetailedLesson(chatId: number, user: BotUser) {
  const lessons = await storage.getLessons({ authorId: user.id });
  let message = `📚 <b>Подробное создание урока</b>\n\n`;
  message += `Ваших уроков: ${lessons.length}\n\n`;
  message += `🔧 <b>Доступные опции:</b>\n`;
  message += `• Создание урока с видео\n`;
  message += `• Настройка сложности и категории\n`;
  message += `• Добавление интерактивных элементов\n\n`;
  message += `💡 <i>Эта функция откроет веб-интерфейс для создания</i>`;

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🌐 Открыть веб-редактор', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/tutor` }],
      [{ text: '🔙 Назад', callback_data: 'create_lesson' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация детального создания квиза
async function handleDetailedQuiz(chatId: number, user: BotUser) {
  const quizzes = await storage.getQuizzes({ authorId: user.id });
  let message = `🧩 <b>Подробное создание квиза</b>\n\n`;
  message += `Ваших квизов: ${quizzes.length}\n\n`;
  message += `🔧 <b>Доступные опции:</b>\n`;
  message += `• Множественный выбор\n`;
  message += `• Открытые вопросы\n`;
  message += `• Настройка времени и сложности\n\n`;
  message += `💡 <i>Эта функция откроет веб-интерфейс для создания</i>`;

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🌐 Открыть веб-редактор', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/tutor` }],
      [{ text: '🔙 Назад', callback_data: 'create_quiz' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация создания игры Эрудит
async function handleCreateErudit(chatId: number, user: BotUser) {
  const sessions = await storage.getEruditSessions({ hostId: user.id });
  let message = `🎯 <b>Создание игры Эрудит</b>\n\n`;
  message += `🎮 Ваших игровых сессий: ${sessions.length}\n\n`;
  message += `🔧 <b>Настройки игры:</b>\n`;
  message += `• Выбор сложности словаря\n`;
  message += `• Настройка времени хода\n`;
  message += `• Игра против ИИ или студентов\n\n`;

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🆚 Против ИИ', callback_data: 'erudit_vs_ai' }],
      [{ text: '👥 Мультиплеер', callback_data: 'erudit_multiplayer' }],
      [{ text: '🌐 Открыть игру', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/tutor` }],
      [{ text: '🔙 Назад', callback_data: 'erudit_game' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация моих игр Эрудит
async function handleMyEruditGames(chatId: number, user: BotUser) {
  const sessions = await storage.getEruditSessions({ hostId: user.id });
  let message = `🎮 <b>Мои игры Эрудит</b>\n\n`;
  
  if (sessions.length === 0) {
    message += `📭 У вас пока нет игровых сессий\n\n`;
    message += `💡 <i>Создайте новую игру!</i>`;
  } else {
    message += `📊 <b>Статистика:</b>\n`;
    const active = sessions.filter((s: any) => s.status === 'active').length;
    const completed = sessions.filter((s: any) => s.status === 'completed').length;
    const won = sessions.filter((s: any) => s.status === 'completed' && s.winnerIds && s.winnerIds.includes(user.id)).length;
    
    message += `• Активных игр: ${active}\n`;
    message += `• Завершенных игр: ${completed}\n`;
    message += `• Побед: ${won}\n\n`;
    
    message += `🏆 <b>Последние игры:</b>\n`;
    sessions.slice(0, 3).forEach((session: any) => {
      const status = session.status === 'active' ? '🟡' : session.winnerIds && session.winnerIds.includes(user.id) ? '🏆' : '❌';
      message += `${status} Игра ${session.id.substring(0, 6)}...\n`;
    });
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🆕 Новая игра', callback_data: 'create_erudit' }],
      [{ text: '🌐 Открыть в веб-версии', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/tutor` }],
      [{ text: '🔙 Назад', callback_data: 'erudit_game' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация таблицы лидеров Эрудит
async function handleEruditLeaderboard(chatId: number, user: BotUser) {
  const allSessions = await storage.getEruditSessions();
  const playerStats = new Map();
  
  // Подсчитываем статистику по игрокам
  allSessions.forEach((session: any) => {
    if (session.status === 'completed' && session.winnerIds && session.winnerIds.length > 0) {
      session.winnerIds.forEach((winnerId: string) => {
        const stats = playerStats.get(winnerId) || { wins: 0, games: 0, name: '' };
        stats.wins++;
        stats.games++;
        playerStats.set(winnerId, stats);
      });
    }
  });

  // Получаем имена игроков
  for (const [playerId, stats] of playerStats.entries()) {
    const player = await storage.getUser(playerId);
    if (player) {
      stats.name = `${player.firstName} ${player.lastName}`;
    }
  }

  const sortedPlayers = Array.from(playerStats.entries())
    .sort((a, b) => b[1].wins - a[1].wins)
    .slice(0, 10);

  let message = `🏆 <b>Таблица лидеров Эрудит</b>\n\n`;
  
  if (sortedPlayers.length === 0) {
    message += `📭 Пока нет завершенных игр\n\n`;
    message += `💡 <i>Станьте первым в таблице лидеров!</i>`;
  } else {
    sortedPlayers.forEach(([playerId, stats], index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
      message += `${medal} <b>${stats.name}</b>\n`;
      message += `   Побед: ${stats.wins} из ${stats.games}\n\n`;
    });
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🎮 Играть', callback_data: 'create_erudit' }],
      [{ text: '🔙 Назад', callback_data: 'erudit_game' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация правил Эрудит
async function handleEruditRules(chatId: number, user: BotUser) {
  let message = `📋 <b>Правила игры Эрудит</b>\n\n`;
  message += `🎯 <b>Цель игры:</b>\n`;
  message += `Набрать максимальное количество очков, составляя слова из букв на игровом поле.\n\n`;
  message += `🎲 <b>Ход игры:</b>\n`;
  message += `1. Каждый игрок получает 7 букв\n`;
  message += `2. По очереди составляйте слова на доске\n`;
  message += `3. Новые слова должны пересекаться с уже размещенными\n`;
  message += `4. За каждую букву начисляются очки\n\n`;
  message += `✨ <b>Бонусы:</b>\n`;
  message += `• Двойная/тройная стоимость буквы\n`;
  message += `• Двойная/тройная стоимость слова\n`;
  message += `• Бонус за использование всех 7 букв\n\n`;
  message += `🏁 <b>Конец игры:</b>\n`;
  message += `Игра заканчивается когда заканчиваются буквы или никто не может сделать ход.`;

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🎮 Начать игру', callback_data: 'create_erudit' }],
      [{ text: '🔙 Назад', callback_data: 'erudit_game' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация детальной аналитики
async function handleDetailedAnalytics(chatId: number, user: BotUser) {
  const students = await storage.getUsersByRole('student');
  const lessons = await storage.getLessons({ authorId: user.id });
  const totalProgress = await Promise.all(
    students.map(student => storage.getUserProgressByUser(student.id))
  );

  let message = `📊 <b>Детальная аналитика</b>\n\n`;
  message += `👥 <b>Ваши студенты:</b> ${students.length}\n`;
  message += `📚 <b>Ваши уроки:</b> ${lessons.length}\n\n`;
  
  if (totalProgress.length > 0) {
    const completed = totalProgress.flat().filter(p => p.completed).length;
    const total = totalProgress.flat().length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    message += `📈 <b>Статистика выполнения:</b>\n`;
    message += `• Завершенные уроки: ${completed}/${total}\n`;
    message += `• Процент выполнения: ${completionRate}%\n\n`;
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '👥 Студенты', callback_data: 'students_analytics' }],
      [{ text: '📚 Уроки', callback_data: 'lessons_analytics' }],
      [{ text: '🌐 Открыть полную аналитику', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/tutor` }],
      [{ text: '🔙 Назад', callback_data: 'analytics' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация аналитики студентов
async function handleStudentsAnalytics(chatId: number, user: BotUser) {
  const students = await storage.getUsersByRole('student');
  
  let message = `👥 <b>Аналитика студентов</b>\n\n`;
  
  if (students.length === 0) {
    message += `📭 У вас пока нет студентов\n\n`;
    message += `💡 <i>Студенты появятся после назначения администратором</i>`;
  } else {
    // Показываем топ-5 активных студентов
    const studentsWithProgress = await Promise.all(
      students.map(async student => {
        const progress = await storage.getUserProgressByUser(student.id);
        const completed = progress.filter(p => p.completed).length;
        return { ...student, completedLessons: completed };
      })
    );
    
    studentsWithProgress
      .sort((a, b) => b.completedLessons - a.completedLessons)
      .slice(0, 5)
      .forEach((student, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
        message += `${medal} <b>${student.firstName} ${student.lastName}</b>\n`;
        message += `   Уровень: ${student.level} | Опыт: ${student.experience}\n`;
        message += `   Завершено уроков: ${student.completedLessons}\n`;
        message += `   Стрик: ${student.streak} дней\n\n`;
      });
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🔙 Назад', callback_data: 'detailed_analytics' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация аналитики уроков
async function handleLessonsAnalytics(chatId: number, user: BotUser) {
  const lessons = await storage.getLessons({ authorId: user.id });
  
  let message = `📚 <b>Аналитика уроков</b>\n\n`;
  
  if (lessons.length === 0) {
    message += `📭 У вас пока нет созданных уроков\n\n`;
    message += `💡 <i>Создайте свой первый урок!</i>`;
  } else {
    // Группируем по сложности
    const byDifficulty = lessons.reduce((acc, lesson) => {
      acc[lesson.difficulty] = (acc[lesson.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    message += `📊 <b>Распределение по сложности:</b>\n`;
    Object.entries(byDifficulty).forEach(([difficulty, count]) => {
      const emoji = difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴';
      const label = difficulty === 'easy' ? 'Легкий' : difficulty === 'medium' ? 'Средний' : 'Сложный';
      message += `${emoji} ${label}: ${count}\n`;
    });

    message += `\n🔥 <b>Популярные уроки:</b>\n`;
    // Показываем первые 3 урока как популярные
    lessons.slice(0, 3).forEach((lesson: any, index: number) => {
      message += `${index + 1}. ${lesson.title}\n`;
      message += `   Категория: ${lesson.category}\n`;
      message += `   Сложность: ${lesson.difficulty}\n\n`;
    });
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '📚 Создать урок', callback_data: 'create_lesson' }],
      [{ text: '🔙 Назад', callback_data: 'detailed_analytics' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация управления студентами (для админов)
async function handleManageStudents(chatId: number, user: BotUser) {
  const students = await storage.getUsersByRole('student');
  
  let message = `👥 <b>Управление студентами</b>\n\n`;
  message += `📊 <b>Всего студентов:</b> ${students.length}\n\n`;
  
  if (students.length === 0) {
    message += `📭 Пока нет зарегистрированных студентов\n\n`;
  } else {
    const activeStudents = students.filter(s => !s.isBlocked).length;
    const blockedStudents = students.filter(s => s.isBlocked).length;
    
    message += `✅ <b>Активных:</b> ${activeStudents}\n`;
    message += `🚫 <b>Заблокированных:</b> ${blockedStudents}\n\n`;
    
    message += `🔝 <b>Топ студенты по опыту:</b>\n`;
    students
      .sort((a: any, b: any) => (b.experience || 0) - (a.experience || 0))
      .slice(0, 5)
      .forEach((student: any, index: number) => {
        const status = student.isBlocked ? '🚫' : student.isOnline ? '🟢' : '⚪';
        message += `${index + 1}. ${status} ${student.firstName} ${student.lastName}\n`;
        message += `   Опыт: ${student.experience || 0} | Уровень: ${student.level}\n\n`;
      });
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🔍 Поиск студента', callback_data: 'search_student' }],
      [{ text: '🚫 Заблокированные', callback_data: 'manage_blocked' }],
      [{ text: '👨‍🏫 Назначить репетитора', callback_data: 'assign_tutor' }],
      [{ text: '🌐 Открыть админ панель', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/admin` }],
      [{ text: '🔙 Назад', callback_data: 'manage_users' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация управления преподавателями
async function handleManageTutors(chatId: number, user: BotUser) {
  const tutors = await storage.getUsersByRole('tutor');
  
  let message = `👨‍🏫 <b>Управление преподавателями</b>\n\n`;
  message += `📊 <b>Всего преподавателей:</b> ${tutors.length}\n\n`;
  
  if (tutors.length === 0) {
    message += `📭 Пока нет зарегистрированных преподавателей\n\n`;
  } else {
    const activeTutors = tutors.filter(t => !t.isBlocked).length;
    const blockedTutors = tutors.filter(t => t.isBlocked).length;
    
    message += `✅ <b>Активных:</b> ${activeTutors}\n`;
    message += `🚫 <b>Заблокированных:</b> ${blockedTutors}\n\n`;
    
    message += `👨‍🏫 <b>Список преподавателей:</b>\n`;
    tutors.slice(0, 5).forEach((tutor: any, index: number) => {
      const status = tutor.isBlocked ? '🚫' : tutor.isOnline ? '🟢' : '⚪';
      message += `${index + 1}. ${status} ${tutor.firstName} ${tutor.lastName}\n`;
      message += `   Опыт: ${tutor.experience || 0} | Уровень: ${tutor.level}\n\n`;
    });
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🔍 Поиск преподавателя', callback_data: 'search_tutor' }],
      [{ text: '🚫 Заблокированные', callback_data: 'manage_blocked' }],
      [{ text: '🌐 Открыть админ панель', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/admin` }],
      [{ text: '🔙 Назад', callback_data: 'manage_users' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация управления заблокированными пользователями
async function handleManageBlocked(chatId: number, user: BotUser) {
  const allUsers = await Promise.all([
    storage.getUsersByRole('student'),
    storage.getUsersByRole('tutor'),
    storage.getUsersByRole('admin')
  ]);
  
  const blockedUsers = allUsers.flat().filter(u => u.isBlocked);
  
  let message = `🚫 <b>Заблокированные пользователи</b>\n\n`;
  message += `📊 <b>Всего заблокированных:</b> ${blockedUsers.length}\n\n`;
  
  if (blockedUsers.length === 0) {
    message += `✅ Заблокированных пользователей нет\n\n`;
    message += `💡 <i>Это хорошо для безопасности платформы!</i>`;
  } else {
    message += `🚫 <b>Список заблокированных:</b>\n`;
    blockedUsers.slice(0, 5).forEach((blockedUser: any, index: number) => {
      const roleEmoji = blockedUser.role === 'student' ? '🎓' : blockedUser.role === 'tutor' ? '👨‍🏫' : '🛠️';
      message += `${index + 1}. ${roleEmoji} ${blockedUser.firstName} ${blockedUser.lastName}\n`;
      message += `   Роль: ${blockedUser.role}\n`;
      message += `   Причина: ${blockedUser.blockReason || 'Не указана'}\n`;
      if (blockedUser.blockedAt) {
        message += `   Заблокирован: ${blockedUser.blockedAt.toLocaleDateString()}\n`;
      }
      message += `\n`;
    });
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🔓 Разблокировать пользователя', callback_data: 'unblock_user' }],
      [{ text: '🌐 Открыть админ панель', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/admin` }],
      [{ text: '🔙 Назад', callback_data: 'manage_users' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация назначения репетитора
async function handleAssignTutor(chatId: number, user: BotUser) {
  const students = await storage.getUsersByRole('student');
  const tutors = await storage.getUsersByRole('tutor');
  
  let message = `👨‍🏫➡️🎓 <b>Назначение репетитора</b>\n\n`;
  message += `👥 <b>Доступно студентов:</b> ${students.length}\n`;
  message += `👨‍🏫 <b>Доступно репетиторов:</b> ${tutors.length}\n\n`;
  
  if (students.length === 0 || tutors.length === 0) {
    message += `⚠️ Для назначения нужны и студенты, и репетиторы\n\n`;
    message += `💡 <i>Убедитесь, что есть пользователи обеих ролей</i>`;
  } else {
    message += `🔧 <b>Варианты назначения:</b>\n`;
    message += `• Назначить конкретного репетитора студенту\n`;
    message += `• Автоматическое распределение\n`;
    message += `• Массовое назначение\n\n`;
    message += `💡 <i>Для точной настройки используйте веб-интерфейс</i>`;
  }

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🎯 Ручное назначение', callback_data: 'manual_assign' }],
      [{ text: '🤖 Автоматическое', callback_data: 'auto_assign' }],
      [{ text: '🌐 Открыть админ панель', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/admin` }],
      [{ text: '🔙 Назад', callback_data: 'manage_students' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация настроек уведомлений
async function handleNotificationPrefs(chatId: number, user: BotUser) {
  let message = `🔔 <b>Настройки уведомлений</b>\n\n`;
  message += `⚙️ <b>Текущие настройки:</b>\n`;
  message += `✅ Уведомления о новых сообщениях\n`;
  message += `✅ Уведомления о достижениях\n`;
  message += `✅ Уведомления о новых уроках\n`;
  message += `❌ Рекламные уведомления\n\n`;
  message += `💡 <i>Для детальной настройки используйте веб-интерфейс</i>`;

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🔕 Отключить все', callback_data: 'disable_all_notifications' }],
      [{ text: '🔔 Включить все', callback_data: 'enable_all_notifications' }],
      [{ text: '🌐 Подробные настройки', url: `${process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/settings` }],
      [{ text: '🔙 Назад', callback_data: 'settings' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация языковых настроек
async function handleLanguageSettings(chatId: number, user: BotUser) {
  let message = `🌍 <b>Языковые настройки</b>\n\n`;
  message += `🔤 <b>Текущий язык интерфейса:</b> Русский\n\n`;
  message += `🗣️ <b>Доступные языки:</b>\n`;
  message += `🇷🇺 Русский (текущий)\n`;
  message += `🇺🇸 English\n`;
  message += `🇪🇸 Español\n`;
  message += `🇫🇷 Français\n\n`;
  message += `💡 <i>Смена языка влияет на весь интерфейс</i>`;

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🇺🇸 English', callback_data: 'set_lang_en' }, { text: '🇪🇸 Español', callback_data: 'set_lang_es' }],
      [{ text: '🇫🇷 Français', callback_data: 'set_lang_fr' }, { text: '🇷🇺 Русский', callback_data: 'set_lang_ru' }],
      [{ text: '🔙 Назад', callback_data: 'settings' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Реализация личной статистики
async function handleMyStatistics(chatId: number, user: BotUser) {
  const userData = await storage.getUser(user.id);
  const userProgress = await storage.getUserProgressByUser(user.id);
  const userAchievements = await storage.getUserAchievements(user.id);
  const gameScores = await storage.getGameScoresByUser(user.id);
  
  let message = `📊 <b>Моя статистика</b>\n\n`;
  message += `👤 <b>${userData?.firstName} ${userData?.lastName}</b>\n`;
  message += `🔹 Роль: ${user.role === 'student' ? '🎓 Студент' : user.role === 'tutor' ? '👨‍🏫 Преподаватель' : '🛠️ Администратор'}\n`;
  message += `🔹 Уровень: ${userData?.level || 1}\n`;
  message += `🔹 Опыт: ${userData?.experience || 0} XP\n`;
  message += `🔹 Стрик: ${userData?.streak || 0} дней\n\n`;
  
  message += `📚 <b>Обучение:</b>\n`;
  const completedLessons = userProgress.filter(p => p.completed).length;
  message += `• Завершено уроков: ${completedLessons}/${userProgress.length}\n`;
  message += `• Достижений получено: ${userAchievements.length}\n\n`;
  
  if (gameScores.length > 0) {
    message += `🎮 <b>Игры:</b>\n`;
    message += `• Игровых сессий: ${gameScores.length}\n`;
    const totalScore = gameScores.reduce((sum, score) => sum + (score.score || 0), 0);
    message += `• Общий счет: ${totalScore}\n\n`;
  }
  
  message += `📅 <b>Активность:</b>\n`;
  message += `• Последняя активность: ${userData?.lastActivity?.toLocaleDateString() || 'Неизвестно'}\n`;
  message += `• Статус: ${userData?.isOnline ? '🟢 Онлайн' : '⚪ Оффлайн'}`;

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: '🏆 Достижения', callback_data: 'achievements' }],
      [{ text: '📊 Прогресс', callback_data: 'progress' }],
      [{ text: '🔙 Назад', callback_data: 'settings' }]
    ]
  };

  await bot!.sendMessage(chatId, message, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
}

// Добавляем обработчик текстовых сообщений для чата и создания контента
bot!.on('text', async (msg) => {
  if (msg.text?.startsWith('/')) return; // Игнорируем команды
  
  const chatId = msg.chat.id;
  const telegramId = msg.from!.id.toString();
  const botUser = activeBotUsers.get(telegramId);
  
  if (!botUser || !botUser.awaitingInput) return;
  
  try {
    if (botUser.awaitingInput.startsWith('chat_message_')) {
      // Обработка сообщения в чате
      const chatSessionId = botUser.awaitingInput.replace('chat_message_', '');
      await storage.createMessage({
        chatId: chatSessionId,
        senderId: botUser.id,
        content: msg.text!
      });
      
      await bot!.sendMessage(chatId, '✅ Сообщение отправлено!');
      botUser.awaitingInput = undefined;
      
    } else if (botUser.awaitingInput === 'quick_lesson_title') {
      // Создание быстрого урока
      const lesson = await storage.createLesson({
        title: msg.text!,
        content: 'Содержание урока будет добавлено позже...',
        authorId: botUser.id,
        difficulty: 'easy',
        category: 'general'
      });
      
      await bot!.sendMessage(chatId, `✅ Урок "${msg.text}" создан! ID: ${lesson.id}`);
      botUser.awaitingInput = undefined;
      
    } else if (botUser.awaitingInput === 'quick_quiz_title') {
      // Создание быстрого квиза
      const quiz = await storage.createQuiz({
        title: msg.text!,
        description: 'Описание будет добавлено позже...',
        questions: [],
        authorId: botUser.id,
        difficulty: 'easy',
        category: 'general'
      });
      
      await bot!.sendMessage(chatId, `✅ Квиз "${msg.text}" создан! ID: ${quiz.id}`);
      botUser.awaitingInput = undefined;
    }
  } catch (error) {
    console.error('Ошибка при обработке текстового сообщения:', error);
    await bot!.sendMessage(chatId, 'Ошибка при обработке сообщения.');
    if (botUser) {
      botUser.awaitingInput = undefined;
    }
  }
});

}

// Обработка сигналов для корректного завершения бота
process.on('SIGINT', () => {
  console.log('Остановка бота...');
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Остановка бота...');
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});
