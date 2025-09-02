import { eq, and, desc, sql } from 'drizzle-orm';
import { db, sqlite } from './db';
import { randomUUID } from "crypto";
import {
  users,
  lessons,
  userProgress,
  games,
  gameScores,
  chats,
  messages,
  achievements,
  userAchievements,
  quizzes,
  quizAttempts,
  telegramMessages,
  adminLogs,
  systemSettings,
  tutorStudents,
  theoryMaterials,
  eruditSessions,
  eruditMoves,
  avatarRequests,
  contentFilters,
  notifications,
  dailyTasks,
  friendships,
  customThemes,
  userThemeSettings,
  videoConferences,
  paymentPlans,
  paymentTransactions,
  type User,
  type InsertUser,
  type Lesson,
  type InsertLesson,
  type UserProgress,
  type InsertUserProgress,
  type Game,
  type InsertGame,
  type GameScore,
  type InsertGameScore,
  type Chat,
  type InsertChat,
  type Message,
  type InsertMessage,
  type Achievement,
  type InsertAchievement,
  type UserAchievement,
  type InsertUserAchievement,
  type Quiz,
  type InsertQuiz,
  type QuizAttempt,
  type InsertQuizAttempt,
  type TelegramMessage,
  type InsertTelegramMessage,
  type AdminLog,
  type InsertAdminLog,
  type SystemSetting,
  type InsertSystemSetting,
  type TutorStudent,
  type InsertTutorStudent,
  type TheoryMaterial,
  type InsertTheoryMaterial,
  type EruditSession,
  type InsertEruditSession,
  type EruditMove,
  type InsertEruditMove,
  type AvatarRequest,
  type InsertAvatarRequest,
  type ContentFilter,
  type InsertContentFilter,
  type Notification as DbNotification,
  type InsertNotification as InsertDbNotification,
  type DailyTask,
  type InsertDailyTask,
  type Friendship,
  type InsertFriendship,
  type CustomTheme,
  type InsertCustomTheme,
  type UserThemeSettings,
  type InsertUserThemeSettings,
  type VideoConference,
  type InsertVideoConference,
  type PaymentPlan,
  type InsertPaymentPlan,
  type PaymentTransaction,
  type InsertPaymentTransaction,
} from "@shared/schema";
import { IStorage } from "./storage";

export class SqliteStorage implements IStorage {
  constructor() {
    this.createTables();
    this.initializeDefaultData();
  }

  private createTables() {
    // Use raw SQLite to create all tables
    try {
      // This will create all tables defined in the schema
      sqlite.exec(`PRAGMA foreign_keys = ON`);

      // Create tables manually since we're using SQLite
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT UNIQUE,
          password TEXT,
          role TEXT NOT NULL DEFAULT 'student',
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          avatar TEXT,
          level INTEGER DEFAULT 1,
          experience INTEGER DEFAULT 0,
          streak INTEGER DEFAULT 0,
          weekly_streak INTEGER DEFAULT 0,
          monthly_streak INTEGER DEFAULT 0,
          best_streak INTEGER DEFAULT 0,
          last_streak_date TEXT,
          last_activity INTEGER,
          is_online INTEGER DEFAULT 0,
          telegram_id TEXT UNIQUE,
          telegram_username TEXT,
          telegram_chat_id TEXT,
          telegram_auth_date INTEGER,
          telegram_hash TEXT,
          subjects TEXT,
          is_blocked INTEGER DEFAULT 0,
          blocked_at INTEGER,
          blocked_by TEXT,
          block_reason TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (blocked_by) REFERENCES users(id)
        );

        -- Add subjects column if it doesn't exist
        PRAGMA table_info(users);
      `);

      // Check for new columns and add them if they don't exist
      const tableInfo = sqlite.prepare(`PRAGMA table_info(users)`).all();
      const columnNames = tableInfo.map((col: any) => col.name);

      const newColumns = [
        { name: 'subjects', sql: 'ALTER TABLE users ADD COLUMN subjects TEXT' },
        { name: 'weekly_streak', sql: 'ALTER TABLE users ADD COLUMN weekly_streak INTEGER DEFAULT 0' },
        { name: 'monthly_streak', sql: 'ALTER TABLE users ADD COLUMN monthly_streak INTEGER DEFAULT 0' },
        { name: 'best_streak', sql: 'ALTER TABLE users ADD COLUMN best_streak INTEGER DEFAULT 0' },
        { name: 'last_streak_date', sql: 'ALTER TABLE users ADD COLUMN last_streak_date TEXT' },
      ];

      for (const column of newColumns) {
        if (!columnNames.includes(column.name)) {
          try {
            sqlite.exec(column.sql);
            console.log(`Added column ${column.name} to users table`);
          } catch (error) {
            console.log(`Failed to add column ${column.name}:`, error);
          }
        }
      }

      // Check and add audio columns to messages table
      const messagesTableInfo = sqlite.prepare(`PRAGMA table_info(messages)`).all();
      const messagesColumnNames = messagesTableInfo.map((col: any) => col.name);

      const messageColumns = [
        { name: 'audio_url', sql: 'ALTER TABLE messages ADD COLUMN audio_url TEXT' },
        { name: 'audio_duration', sql: 'ALTER TABLE messages ADD COLUMN audio_duration INTEGER' },
        { name: 'audio_transcript', sql: 'ALTER TABLE messages ADD COLUMN audio_transcript TEXT' },
      ];

      for (const column of messageColumns) {
        if (!messagesColumnNames.includes(column.name)) {
          try {
            sqlite.exec(column.sql);
            console.log(`Added column ${column.name} to messages table`);
          } catch (error) {
            console.log(`Failed to add column ${column.name}:`, error);
          }
        }
      }

      // Create other essential tables
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS lessons (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          difficulty TEXT NOT NULL,
          category TEXT NOT NULL,
          video_url TEXT,
          duration INTEGER,
          content TEXT,
          is_published INTEGER DEFAULT 0,
          author_id TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (author_id) REFERENCES users(id)
        );
      `);

      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          tutor_id TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (student_id) REFERENCES users(id),
          FOREIGN KEY (tutor_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT DEFAULT 'text',
          metadata TEXT,
          audio_url TEXT,
          audio_duration INTEGER,
          audio_transcript TEXT,
          is_read INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (chat_id) REFERENCES chats(id),
          FOREIGN KEY (sender_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS games (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          difficulty TEXT NOT NULL,
          config TEXT,
          is_active INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL
        );
      `);

      // Theory materials table (matching Drizzle schema exactly)
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS theory_materials (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          file_url TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER,
          category TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          author_id TEXT NOT NULL,
          is_published INTEGER DEFAULT 0,
          view_count INTEGER DEFAULT 0,
          download_count INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (author_id) REFERENCES users(id)
        );
      `);

      // Progress table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          lesson_id TEXT,
          material_id TEXT,
          game_id TEXT,
          status TEXT NOT NULL DEFAULT 'not_started',
          score INTEGER DEFAULT 0,
          completed_at INTEGER,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (lesson_id) REFERENCES lessons(id),
          FOREIGN KEY (material_id) REFERENCES theory_materials(id),
          FOREIGN KEY (game_id) REFERENCES games(id)
        );
      `);

      // Quizzes table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS quizzes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          questions TEXT NOT NULL,
          difficulty TEXT NOT NULL DEFAULT 'beginner',
          time_limit INTEGER,
          author_id TEXT NOT NULL,
          is_published INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (author_id) REFERENCES users(id)
        );
      `);

      // System settings table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id TEXT PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL,
          updated_by TEXT,
          updated_at INTEGER,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (updated_by) REFERENCES users(id)
        );
      `);

      // Admin logs table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS admin_logs (
          id TEXT PRIMARY KEY,
          admin_id TEXT NOT NULL,
          action TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (admin_id) REFERENCES users(id)
        );
      `);

      // Avatar requests table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS avatar_requests (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          avatar_url TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          rejection_reason TEXT,
          reviewed_by TEXT,
          reviewed_at INTEGER,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (reviewed_by) REFERENCES users(id)
        );
      `);

      // Notifications table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          is_read INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      // Content filters table  
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS content_filters (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          value TEXT NOT NULL,
          category TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'medium',
          description TEXT,
          is_active INTEGER DEFAULT 1,
          added_by TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER,
          FOREIGN KEY (added_by) REFERENCES users(id)
        );
      `);

      // Achievements table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS achievements (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          icon TEXT NOT NULL,
          category TEXT NOT NULL,
          condition TEXT,
          points INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL
        );
      `);

      // User achievements table  
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS user_achievements (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          achievement_id TEXT NOT NULL,
          unlocked_at INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (achievement_id) REFERENCES achievements(id)
        );
      `);

      // Daily tasks table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS daily_tasks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          task_type TEXT NOT NULL,
          task_data TEXT,
          is_completed INTEGER DEFAULT 0,
          date TEXT NOT NULL,
          reward INTEGER DEFAULT 10,
          completed_at INTEGER,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      // Friendships table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS friendships (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          friend_id TEXT NOT NULL,
          status TEXT NOT NULL,
          requested_by TEXT NOT NULL,
          accepted_at INTEGER,
          blocked_at INTEGER,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (friend_id) REFERENCES users(id),
          FOREIGN KEY (requested_by) REFERENCES users(id)
        );
      `);

      // Game scores table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS game_scores (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          game_id TEXT NOT NULL,
          score INTEGER NOT NULL,
          duration INTEGER,
          accuracy INTEGER,
          level INTEGER,
          played_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (game_id) REFERENCES games(id)
        );
      `);

      // Quiz attempts table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS quiz_attempts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          quiz_id TEXT NOT NULL,
          answers TEXT NOT NULL,
          score INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          time_spent INTEGER,
          completed_at INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
        );
      `);

      // Telegram messages table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS telegram_messages (
          id TEXT PRIMARY KEY,
          telegram_message_id INTEGER NOT NULL,
          chat_id TEXT,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT DEFAULT 'text',
          is_from_telegram INTEGER DEFAULT 1,
          telegram_chat_id TEXT NOT NULL,
          synced_at INTEGER,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (chat_id) REFERENCES chats(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      // Tutor students table  
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS tutor_students (
          id TEXT PRIMARY KEY,
          tutor_id TEXT NOT NULL,
          student_id TEXT NOT NULL,
          assigned_at INTEGER,
          is_active INTEGER DEFAULT 1,
          notes TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (tutor_id) REFERENCES users(id),
          FOREIGN KEY (student_id) REFERENCES users(id)
        );
      `);

      // Erudit sessions table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS erudit_sessions (
          id TEXT PRIMARY KEY,
          host_id TEXT NOT NULL,
          players TEXT NOT NULL,
          game_state TEXT NOT NULL,
          current_player INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'waiting',
          total_moves INTEGER DEFAULT 0,
          started_at INTEGER,
          finished_at INTEGER,
          winner_ids TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (host_id) REFERENCES users(id)
        );
      `);

      // Erudit moves table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS erudit_moves (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          player_id TEXT NOT NULL,
          word TEXT NOT NULL,
          letters TEXT NOT NULL,
          score INTEGER NOT NULL,
          move_number INTEGER NOT NULL,
          board_state TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (session_id) REFERENCES erudit_sessions(id),
          FOREIGN KEY (player_id) REFERENCES users(id)
        );
      `);

      // Custom Themes table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS custom_themes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          author_id TEXT NOT NULL,
          color_scheme TEXT NOT NULL,
          gradients TEXT,
          animations TEXT,
          background_type TEXT NOT NULL DEFAULT 'static',
          background_url TEXT,
          is_public INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          download_count INTEGER DEFAULT 0,
          rating INTEGER DEFAULT 0,
          tags TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER,
          FOREIGN KEY (author_id) REFERENCES users(id)
        );
      `);

      // User Theme Settings table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS user_theme_settings (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          active_theme_id TEXT,
          custom_settings TEXT,
          animations_enabled INTEGER DEFAULT 1,
          background_effects INTEGER DEFAULT 1,
          updated_at INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (active_theme_id) REFERENCES custom_themes(id)
        );
      `);

      // Video Conferences table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS video_conferences (
          id TEXT PRIMARY KEY,
          host_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          participants TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'lesson',
          status TEXT NOT NULL DEFAULT 'scheduled',
          scheduled_at INTEGER,
          started_at INTEGER,
          ended_at INTEGER,
          max_participants INTEGER DEFAULT 10,
          recording_url TEXT,
          settings TEXT,
          whiteboard_data TEXT,
          chat_history TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (host_id) REFERENCES users(id)
        );
      `);

      // Payment Plans table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS payment_plans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          price INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'RUB',
          duration INTEGER,
          features TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER
        );
      `);

      // Payment Transactions table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          plan_id TEXT,
          amount INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'RUB',
          status TEXT NOT NULL DEFAULT 'pending',
          payment_method TEXT NOT NULL,
          transaction_id TEXT,
          description TEXT,
          metadata TEXT,
          paid_at INTEGER,
          refunded_at INTEGER,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (plan_id) REFERENCES payment_plans(id)
        );
      `);

      // User progress table (renamed from progress to match schema)
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS user_progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          progress INTEGER DEFAULT 0,
          score INTEGER,
          time_spent INTEGER,
          completed_at INTEGER,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (lesson_id) REFERENCES lessons(id)
        );
      `);

      console.log('SQLite tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
    }
  }

  private async initializeDefaultData() {
    const now = Date.now();

    // Always ensure system settings exist
    try {
      const adminPassword = await this.getSystemSetting("admin_password");
      if (!adminPassword) {
        // Create admin user first if doesn't exist
        const adminUser = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
        let adminId = adminUser[0]?.id;

        if (!adminId) {
          adminId = randomUUID();
          await db.insert(users).values({
            id: adminId,
            username: "admin",
            email: "admin@example.com",
            password: "password",
            role: "admin",
            firstName: "Администратор",
            lastName: "Системы",
            avatar: null,
            level: 1,
            experience: 0,
            streak: 0,
            lastActivity: now,
            isOnline: false,
            telegramId: null,
            telegramUsername: null,
            telegramChatId: null,
            telegramAuthDate: null,
            telegramHash: null,
            subjects: null,
            isBlocked: false,
            blockedAt: null,
            blockedBy: null,
            blockReason: null,
            createdAt: now,
          });
        }

        // Create system settings
        await db.insert(systemSettings).values([
          {
            id: randomUUID(),
            key: "admin_password",
            value: "admin123",
            description: "Пароль для доступа в админ панель",
            category: "admin",
            updatedBy: adminId,
            updatedAt: now,
            createdAt: now,
          },
          {
            id: randomUUID(),
            key: "telegram_bot_token",
            value: "",
            description: "Токен Telegram бота для интеграции",
            category: "telegram",
            updatedBy: adminId,
            updatedAt: now,
            createdAt: now,
          },
        ]);

        // Create default content filters while we have adminId available
        const sampleContentFilters = [
          {
            id: randomUUID(),
            type: 'word',
            value: 'блядь',
            category: 'profanity',
            severity: 'high',
            description: 'Нецензурное выражение',
            isActive: true,
            addedBy: adminId,
            createdAt: now,
            updatedAt: null,
          },
          {
            id: randomUUID(),
            type: 'word',
            value: 'дурак',
            category: 'profanity',
            severity: 'medium',
            description: 'Оскорбительное слово',
            isActive: true,
            addedBy: adminId,
            createdAt: now,
            updatedAt: null,
          },
          {
            id: randomUUID(),
            type: 'symbol',
            value: '💩',
            category: 'inappropriate_symbols',
            severity: 'medium',
            description: 'Неподходящий символ',
            isActive: true,
            addedBy: adminId,
            createdAt: now,
            updatedAt: null,
          },
          {
            id: randomUUID(),
            type: 'pattern',
            value: '\\b\\d{16}\\b',
            category: 'inappropriate_symbols',
            severity: 'high',
            description: 'Номера карт (16 цифр подряд)',
            isActive: true,
            addedBy: adminId,
            createdAt: now,
            updatedAt: null,
          }
        ];

        for (const filter of sampleContentFilters) {
          await db.insert(contentFilters).values(filter);
        }

        // Create sample admin log entry
        await db.insert(adminLogs).values({
          id: randomUUID(),
          adminId: adminId,
          action: 'system_init',
          targetType: 'system',
          targetId: 'initialization',
          details: JSON.stringify({
            message: 'Система инициализирована',
            tablesCreated: true,
            defaultDataCreated: true
          }),
          ipAddress: '127.0.0.1',
          userAgent: 'System Initialization',
          createdAt: now,
        });
      }
    } catch (error) {
      console.error('Error initializing system settings:', error);
    }

    try {
      // Check if all demo data already exists
      const existingDemoStudent = await db.select().from(users).where(eq(users.username, 'demo_student')).limit(1);
      const existingDemoTeacher = await db.select().from(users).where(eq(users.username, 'demo_teacher')).limit(1);
      const existingDemoParent = await db.select().from(users).where(eq(users.username, 'demo_parent')).limit(1);

      console.log('Demo data check:');
      console.log('- demo_student exists:', existingDemoStudent.length > 0);
      console.log('- demo_teacher exists:', existingDemoTeacher.length > 0);
      console.log('- demo_parent exists:', existingDemoParent.length > 0);

      if (existingDemoStudent.length > 0 && existingDemoTeacher.length > 0 && existingDemoParent.length > 0) {
        console.log('All demo users exist, skipping initialization');
        return; // All demo data already exists
      } else {
        console.log('Some demo users missing, creating all demo users');
      }
    } catch (error) {
      console.log('Error checking demo users, continuing with initialization:', error);
      // Tables might not exist yet or other error, continue with initialization
    }

    // Create demo users that match the route expectations
    const sampleUsers = [
      {
        id: randomUUID(),
        username: "demo_student",
        email: "demo.student@example.com",
        password: "password",
        role: "student",
        firstName: "Демо",
        lastName: "Студент",
        avatar: null,
        level: 5,
        experience: 2450,
        streak: 12,
        lastActivity: now,
        isOnline: false,
        telegramId: "123456789",
        telegramUsername: "demo_student",
        telegramChatId: "123456789",
        telegramAuthDate: now,
        telegramHash: "sample_hash",
        isBlocked: false,
        blockedAt: null,
        blockedBy: null,
        blockReason: null,
        createdAt: now,
      },
      {
        id: randomUUID(),
        username: "demo_teacher",
        email: "demo.teacher@example.com",
        password: "password",
        role: "tutor",
        firstName: "Демо",
        lastName: "Преподаватель",
        avatar: null,
        level: 10,
        experience: 5000,
        streak: 45,
        lastActivity: now,
        isOnline: false,
        telegramId: "987654321",
        telegramUsername: "demo_teacher",
        telegramChatId: "987654321",
        telegramAuthDate: now,
        telegramHash: "tutor_hash",
        isBlocked: false,
        blockedAt: null,
        blockedBy: null,
        blockReason: null,
        createdAt: now,
      },
      {
        id: randomUUID(),
        username: "demo_parent",
        email: "demo.parent@example.com",
        password: "password",
        role: "parent",
        firstName: "Демо",
        lastName: "Родитель",
        avatar: null,
        level: 3,
        experience: 500,
        streak: 5,
        lastActivity: now,
        isOnline: false,
        telegramId: "555666777",
        telegramUsername: "demo_parent",
        telegramChatId: "555666777",
        telegramAuthDate: now,
        telegramHash: "parent_hash",
        isBlocked: false,
        blockedAt: null,
        blockedBy: null,
        blockReason: null,
        createdAt: now,
      },
      {
        id: randomUUID(),
        username: "admin",
        email: "admin@example.com",
        password: "password",
        role: "admin",
        firstName: "Администратор",
        lastName: "Системы",
        avatar: null,
        level: 1,
        experience: 0,
        streak: 0,
        lastActivity: now,
        isOnline: false,
        telegramId: null,
        telegramUsername: null,
        telegramChatId: null,
        telegramAuthDate: null,
        telegramHash: null,
        isBlocked: false,
        blockedAt: null,
        blockedBy: null,
        blockReason: null,
        createdAt: now,
      }
    ];

    try {
      console.log('Creating demo users...');
      for (const user of sampleUsers) {
        try {
          console.log('Creating user:', user.username, 'with role:', user.role);
          await db.insert(users).values(user);
          console.log('Successfully created user:', user.username);
        } catch (userError) {
          console.error('Error creating user', user.username, ':', userError);
          // Continue with next user
        }
      }
      console.log('Demo user creation process completed');

      // Initialize system settings
      const adminId = sampleUsers[3].id;
      await db.insert(systemSettings).values([
        {
          id: randomUUID(),
          key: "telegram_bot_token",
          value: "",
          description: "Токен Telegram бота для интеграции",
          category: "telegram",
          updatedBy: adminId,
          updatedAt: now,
          createdAt: now,
        },
        {
          id: randomUUID(),
          key: "admin_password",
          value: "admin123",
          description: "Пароль для доступа в админ панель",
          category: "admin",
          updatedBy: adminId,
          updatedAt: now,
          createdAt: now,
        },
      ]);

      // Create sample games
      const sampleGames = [
        {
          id: randomUUID(),
          type: "word_memory",
          title: "Память слов",
          description: "Запомните и найдите пары слов",
          difficulty: "medium",
          config: JSON.stringify({ timeLimit: 30, wordCount: 8 }),
          isActive: true,
          createdAt: now,
        },
        {
          id: randomUUID(),
          type: "grammar_builder",
          title: "Конструктор предложений",
          description: "Составьте правильные предложения",
          difficulty: "medium",
          config: JSON.stringify({ timeLimit: 60, sentenceCount: 5 }),
          isActive: true,
          createdAt: now,
        },
      ];

      for (const game of sampleGames) {
        await db.insert(games).values(game);
      }

      // Create sample achievements
      const sampleAchievements = [
        {
          id: randomUUID(),
          title: "Первые шаги",
          description: "Завершить первый урок",
          icon: "🏆",
          category: "learning",
          condition: JSON.stringify({ type: "lessons_completed", value: 1 }),
          points: 50,
          isActive: true,
          createdAt: now,
        }
      ];

      for (const achievement of sampleAchievements) {
        await db.insert(achievements).values(achievement);
      }

    } catch (error) {
      // Ignore errors during initialization (might be unique constraint violations)
      console.log('Database initialization completed (some errors may be expected)');
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!result[0]) return undefined;

    return {
      ...result[0],
      subjects: result[0].subjects ? JSON.parse(result[0].subjects) : null
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!result[0]) return undefined;

    return {
      ...result[0],
      subjects: result[0].subjects ? JSON.parse(result[0].subjects) : null
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      email: insertUser.email || null,
      password: insertUser.password || null,
      role: insertUser.role || 'student',
      avatar: insertUser.avatar || null,
      level: insertUser.level || 1,
      experience: insertUser.experience || 0,
      streak: insertUser.streak || 0,
      weeklyStreak: insertUser.weeklyStreak || 0,
      monthlyStreak: insertUser.monthlyStreak || 0,
      bestStreak: insertUser.bestStreak || 0,
      lastStreakDate: insertUser.lastStreakDate || null,
      lastActivity: Date.now(),
      isOnline: insertUser.isOnline || false,
      telegramId: insertUser.telegramId || null,
      telegramUsername: insertUser.telegramUsername || null,
      telegramChatId: insertUser.telegramChatId || null,
      telegramAuthDate: insertUser.telegramAuthDate || null,
      telegramHash: insertUser.telegramHash || null,
      isBlocked: insertUser.isBlocked || false,
      blockedAt: insertUser.blockedAt || null,
      blockedBy: insertUser.blockedBy || null,
      blockReason: insertUser.blockReason || null,
      subjects: insertUser.subjects || null,
      createdAt: Date.now(),
    };

    await db.insert(users).values(user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    await db.update(users).set(updates).where(eq(users.id, id));
    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      // Delete related records first
      await db.delete(userProgress).where(eq(userProgress.userId, id));
      await db.delete(gameScores).where(eq(gameScores.userId, id));
      await db.delete(messages).where(eq(messages.senderId, id));
      await db.delete(userAchievements).where(eq(userAchievements.userId, id));
      await db.delete(quizAttempts).where(eq(quizAttempts.userId, id));

      // Finally, delete the user
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    if (!role) {
      // If no role specified, return all users
      return await db.select().from(users);
    }
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getUserBySubjects(subjects: string[]): Promise<User[]> {
    if (!subjects || subjects.length === 0) {
      return [];
    }

    // For SQLite, we'll search for tutors who have any of the subjects in their subjects field
    const tutors = await db.select().from(users).where(eq(users.role, 'tutor'));

    return tutors.filter(tutor => {
      if (!tutor.subjects) return false;
      const tutorSubjects = JSON.parse(tutor.subjects);
      return subjects.some(subject => tutorSubjects.includes(subject));
    });
  }

  async getAllUsers(): Promise<User[]> {
    const results = await db.select().from(users);
    return results.map(user => ({
      ...user,
      subjects: user.subjects ? JSON.parse(user.subjects) : null
    }));
  }

  async searchUsers(search: string): Promise<User[]> {
    const searchTerm = `%${search.toLowerCase()}%`;
    const results = await db.select().from(users).where(
      sql`lower(${users.username}) LIKE ${searchTerm} OR 
          lower(${users.firstName}) LIKE ${searchTerm} OR 
          lower(${users.lastName}) LIKE ${searchTerm} OR
          lower(${users.email}) LIKE ${searchTerm}`
    );

    return results.map(user => ({
      ...user,
      subjects: user.subjects ? JSON.parse(user.subjects) : null
    }));
  }

  async getUsersCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(users);
    return Number(result[0].count);
  }

  // Lesson methods
  async getLesson(id: string): Promise<Lesson | undefined> {
    const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
    return result[0];
  }

  async getLessons(filters?: { difficulty?: string; category?: string; authorId?: string }): Promise<Lesson[]> {
    let conditions = [];

    if (filters?.difficulty) {
      conditions.push(eq(lessons.difficulty, filters.difficulty));
    }
    if (filters?.category) {
      conditions.push(eq(lessons.category, filters.category));
    }
    if (filters?.authorId) {
      conditions.push(eq(lessons.authorId, filters.authorId));
    }

    if (conditions.length > 0) {
      return await db.select().from(lessons).where(and(...conditions)).orderBy(desc(lessons.createdAt));
    }

    return await db.select().from(lessons).orderBy(desc(lessons.createdAt));
  }

  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const id = randomUUID();
    const lesson: Lesson = {
      ...insertLesson,
      id,
      description: insertLesson.description || null,
      videoUrl: insertLesson.videoUrl || null,
      duration: insertLesson.duration || null,
      content: insertLesson.content || null,
      isPublished: insertLesson.isPublished || false,
      authorId: insertLesson.authorId || null,
      createdAt: Date.now(),
    };

    await db.insert(lessons).values(lesson);
    return lesson;
  }

  async updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined> {
    await db.update(lessons).set(updates).where(eq(lessons.id, id));
    return this.getLesson(id);
  }

  async deleteLesson(id: string): Promise<boolean> {
    try {
      await db.delete(lessons).where(eq(lessons.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  // User Progress methods
  async getUserProgress(userId: string, lessonId: string): Promise<UserProgress | undefined> {
    const result = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.lessonId, lessonId)))
      .limit(1);
    return result[0];
  }

  async getUserProgressByUser(userId: string): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const id = randomUUID();
    const progress: UserProgress = {
      ...insertProgress,
      id,
      completed: insertProgress.completed || false,
      progress: insertProgress.progress || 0,
      score: insertProgress.score || null,
      timeSpent: insertProgress.timeSpent || null,
      completedAt: insertProgress.completedAt || null,
      createdAt: Date.now(),
    };

    await db.insert(userProgress).values(progress);
    return progress;
  }

  async updateUserProgress(id: string, updates: Partial<UserProgress>): Promise<UserProgress | undefined> {
    await db.update(userProgress).set(updates).where(eq(userProgress.id, id));
    return this.getUserProgress(updates.userId!, updates.lessonId!);
  }

  // Games methods
  async getGame(id: string): Promise<Game | undefined> {
    const result = await db.select().from(games).where(eq(games.id, id)).limit(1);
    return result[0];
  }

  async getGames(type?: string): Promise<Game[]> {
    if (type) {
      return await db.select().from(games).where(eq(games.type, type));
    }
    return await db.select().from(games);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = {
      ...insertGame,
      id,
      description: insertGame.description || null,
      config: insertGame.config || null,
      isActive: insertGame.isActive || true,
      createdAt: Date.now(),
    };

    await db.insert(games).values(game);
    return game;
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined> {
    await db.update(games).set(updates).where(eq(games.id, id));
    return this.getGame(id);
  }

  // Game Scores methods
  async getGameScore(id: string): Promise<GameScore | undefined> {
    const result = await db.select().from(gameScores).where(eq(gameScores.id, id)).limit(1);
    return result[0];
  }

  async getGameScoresByUser(userId: string): Promise<GameScore[]> {
    return await db.select().from(gameScores).where(eq(gameScores.userId, userId));
  }

  async getGameScoresByGame(gameId: string): Promise<GameScore[]> {
    return await db.select().from(gameScores).where(eq(gameScores.gameId, gameId));
  }

  async createGameScore(insertScore: InsertGameScore): Promise<GameScore> {
    const id = randomUUID();
    const score: GameScore = {
      ...insertScore,
      id,
      duration: insertScore.duration || null,
      accuracy: insertScore.accuracy || null,
      level: insertScore.level || null,
      playedAt: Date.now(),
    };

    await db.insert(gameScores).values(score);
    return score;
  }

  async getLeaderboard(gameId?: string, limit = 10): Promise<GameScore[]> {
    if (gameId) {
      return await db.select()
        .from(gameScores)
        .where(eq(gameScores.gameId, gameId))
        .orderBy(desc(gameScores.score))
        .limit(limit);
    }

    return await db.select()
      .from(gameScores)
      .orderBy(desc(gameScores.score))
      .limit(limit);
  }

  // Chat methods
  async getChat(id: string): Promise<Chat | undefined> {
    const result = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
    return result[0];
  }

  async getChatByUsers(studentId: string, tutorId: string): Promise<Chat | undefined> {
    const result = await db
      .select()
      .from(chats)
      .where(and(eq(chats.studentId, studentId), eq(chats.tutorId, tutorId)))
      .limit(1);
    return result[0];
  }

  async getChatsByUser(userId: string): Promise<Chat[]> {
    // A user can be either student or tutor in chats
    const asStudent = await db.select().from(chats).where(eq(chats.studentId, userId));
    const asTutor = await db.select().from(chats).where(eq(chats.tutorId, userId));
    return [...asStudent, ...asTutor];
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = randomUUID();
    const chat: Chat = {
      ...insertChat,
      id,
      isActive: insertChat.isActive || true,
      createdAt: Date.now(),
    };

    await db.insert(chats).values(chat);
    return chat;
  }

  // Message methods
  async getMessage(id: string): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0];
  }

  async getMessagesByChat(chatId: string, limit = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      type: insertMessage.type || "text",
      metadata: insertMessage.metadata || null,
      audioUrl: insertMessage.audioUrl || null,
      audioDuration: insertMessage.audioDuration || null,
      audioTranscript: insertMessage.audioTranscript || null,
      isRead: insertMessage.isRead || false,
      createdAt: Date.now(),
    };

    await db.insert(messages).values(message);
    return message;
  }

  async markMessageAsRead(id: string): Promise<boolean> {
    try {
      await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Achievement methods
  async getAchievement(id: string): Promise<Achievement | undefined> {
    const result = await db.select().from(achievements).where(eq(achievements.id, id)).limit(1);
    return result[0];
  }

  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements);
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const id = randomUUID();
    const achievement: Achievement = {
      ...insertAchievement,
      id,
      condition: insertAchievement.condition || null,
      points: insertAchievement.points || 0,
      isActive: insertAchievement.isActive || true,
      createdAt: Date.now(),
    };

    await db.insert(achievements).values(achievement);
    return achievement;
  }

  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
  }

  async createUserAchievement(insertUserAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const id = randomUUID();
    const userAchievement: UserAchievement = {
      ...insertUserAchievement,
      id,
      unlockedAt: Date.now(),
    };

    await db.insert(userAchievements).values(userAchievement);
    return userAchievement;
  }

  // Quiz methods
  async getQuiz(id: string): Promise<Quiz | undefined> {
    const result = await db.select().from(quizzes).where(eq(quizzes.id, id)).limit(1);
    return result[0];
  }

  async getQuizzes(filters?: { difficulty?: string; category?: string; authorId?: string }): Promise<Quiz[]> {
    let conditions = [];

    if (filters?.difficulty) {
      conditions.push(eq(quizzes.difficulty, filters.difficulty));
    }
    if (filters?.category) {
      conditions.push(eq(quizzes.category, filters.category));
    }
    if (filters?.authorId) {
      conditions.push(eq(quizzes.authorId, filters.authorId));
    }

    if (conditions.length > 0) {
      return await db.select().from(quizzes).where(and(...conditions)).orderBy(desc(quizzes.createdAt));
    }

    return await db.select().from(quizzes).orderBy(desc(quizzes.createdAt));
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const id = randomUUID();
    const quiz: Quiz = {
      ...insertQuiz,
      id,
      description: insertQuiz.description || null,
      authorId: insertQuiz.authorId || null,
      isPublished: insertQuiz.isPublished || false,
      createdAt: Date.now(),
    };

    await db.insert(quizzes).values(quiz);
    return quiz;
  }

  async updateQuiz(id: string, updates: Partial<Quiz>): Promise<Quiz | undefined> {
    await db.update(quizzes).set(updates).where(eq(quizzes.id, id));
    return this.getQuiz(id);
  }

  async deleteQuiz(id: string): Promise<boolean> {
    try {
      await db.delete(quizzes).where(eq(quizzes.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Quiz Attempt methods
  async getQuizAttempt(id: string): Promise<QuizAttempt | undefined> {
    const result = await db.select().from(quizAttempts).where(eq(quizAttempts.id, id)).limit(1);
    return result[0];
  }

  async getQuizAttemptsByUser(userId: string): Promise<QuizAttempt[]> {
    return await db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId));
  }

  async createQuizAttempt(insertAttempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const id = randomUUID();
    const attempt: QuizAttempt = {
      ...insertAttempt,
      id,
      timeSpent: insertAttempt.timeSpent || null,
      completedAt: Date.now(),
    };

    await db.insert(quizAttempts).values(attempt);
    return attempt;
  }

  // Telegram methods
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    return result[0];
  }

  async updateUserTelegramData(userId: string, telegramData: Partial<User>): Promise<User | undefined> {
    await db.update(users).set(telegramData).where(eq(users.id, userId));
    return this.getUser(userId);
  }

  async getTelegramMessage(id: string): Promise<TelegramMessage | undefined> {
    const result = await db.select().from(telegramMessages).where(eq(telegramMessages.id, id)).limit(1);
    return result[0];
  }

  async getTelegramMessagesByChat(telegramChatId: string): Promise<TelegramMessage[]> {
    return await db.select().from(telegramMessages).where(eq(telegramMessages.telegramChatId, telegramChatId));
  }

  async createTelegramMessage(insertMessage: InsertTelegramMessage): Promise<TelegramMessage> {
    const id = randomUUID();
    const message: TelegramMessage = {
      ...insertMessage,
      id,
      type: insertMessage.type || "text",
      chatId: insertMessage.chatId || null,
      isFromTelegram: insertMessage.isFromTelegram || true,
      syncedAt: null,
      createdAt: Date.now(),
    };

    await db.insert(telegramMessages).values(message);
    return message;
  }

  async syncTelegramMessage(telegramMessageId: number, chatId: string): Promise<boolean> {
    try {
      await db
        .update(telegramMessages)
        .set({ syncedAt: Date.now() })
        .where(and(
          eq(telegramMessages.telegramMessageId, telegramMessageId),
          eq(telegramMessages.chatId, chatId)
        ));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Admin methods
  async createAdminLog(insertLog: InsertAdminLog): Promise<AdminLog> {
    const id = randomUUID();
    const log: AdminLog = {
      ...insertLog,
      id,
      details: insertLog.details || null,
      ipAddress: insertLog.ipAddress || null,
      userAgent: insertLog.userAgent || null,
      createdAt: Date.now(),
    };

    await db.insert(adminLogs).values(log);
    return log;
  }

  async getAdminLogs(adminId?: string, limit = 50): Promise<AdminLog[]> {
    if (adminId) {
      return await db.select()
        .from(adminLogs)
        .where(eq(adminLogs.adminId, adminId))
        .orderBy(desc(adminLogs.createdAt))
        .limit(limit);
    }

    return await db.select()
      .from(adminLogs)
      .orderBy(desc(adminLogs.createdAt))
      .limit(limit);
  }

  async blockUser(userId: string, adminId: string, reason?: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          isBlocked: true,
          blockedAt: Date.now(),
          blockedBy: adminId,
          blockReason: reason || null
        })
        .where(eq(users.id, userId));

      // Log the action
      await this.createAdminLog({
        adminId,
        action: "block_user",
        targetType: "user",
        targetId: userId,
        details: JSON.stringify({ reason }),
        ipAddress: null,
        userAgent: null,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async unblockUser(userId: string, adminId: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          isBlocked: false,
          blockedAt: null,
          blockedBy: null,
          blockReason: null
        })
        .where(eq(users.id, userId));

      // Log the action
      await this.createAdminLog({
        adminId,
        action: "unblock_user",
        targetType: "user",
        targetId: userId,
        details: JSON.stringify({}),
        ipAddress: null,
        userAgent: null,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // System Settings methods
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
    return result[0];
  }

  async getSystemSettings(category?: string): Promise<SystemSetting[]> {
    if (category) {
      return await db.select().from(systemSettings).where(eq(systemSettings.category, category));
    }
    return await db.select().from(systemSettings);
  }

  async setSystemSetting(insertSetting: InsertSystemSetting): Promise<SystemSetting> {
    const existing = await this.getSystemSetting(insertSetting.key);

    if (existing) {
      const updated = await this.updateSystemSetting(insertSetting.key, insertSetting.value, insertSetting.updatedBy || null);
      if (!updated) throw new Error("Failed to update setting");
      return updated;
    }

    const id = randomUUID();
    const setting: SystemSetting = {
      ...insertSetting,
      id,
      description: insertSetting.description || null,
      category: insertSetting.category || null,
      updatedBy: insertSetting.updatedBy || null,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    await db.insert(systemSettings).values(setting);
    return setting;
  }

  async updateSystemSetting(key: string, value: string, updatedBy: string | null): Promise<SystemSetting | undefined> {
    await db
      .update(systemSettings)
      .set({ 
        value, 
        updatedBy,
        updatedAt: Date.now() 
      })
      .where(eq(systemSettings.key, key));

    return this.getSystemSetting(key);
  }

  // Tutor-Student methods
  async getTutorStudents(tutorId: string): Promise<TutorStudent[]> {
    return await db
      .select()
      .from(tutorStudents)
      .where(and(eq(tutorStudents.tutorId, tutorId), eq(tutorStudents.isActive, true)))
      .orderBy(desc(tutorStudents.createdAt));
  }

  async getStudentTutors(studentId: string): Promise<TutorStudent[]> {
    return await db
      .select()
      .from(tutorStudents)
      .where(and(eq(tutorStudents.studentId, studentId), eq(tutorStudents.isActive, true)))
      .orderBy(desc(tutorStudents.createdAt));
  }

  async assignTutorToStudent(insertAssignment: InsertTutorStudent): Promise<TutorStudent> {
    const id = randomUUID();
    const assignment: TutorStudent = {
      ...insertAssignment,
      id,
      isActive: insertAssignment.isActive || true,
      notes: insertAssignment.notes || null,
      assignedAt: null,
      createdAt: Date.now(),
    };

    await db.insert(tutorStudents).values(assignment);
    return assignment;
  }

  async unassignTutorFromStudent(tutorId: string, studentId: string): Promise<boolean> {
    try {
      await db
        .delete(tutorStudents)
        .where(and(
          eq(tutorStudents.tutorId, tutorId),
          eq(tutorStudents.studentId, studentId)
        ));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Theory Materials methods
  async getTheoryMaterial(id: string): Promise<TheoryMaterial | undefined> {
    const result = await db.select().from(theoryMaterials).where(eq(theoryMaterials.id, id)).limit(1);
    return result[0];
  }

  async getTheoryMaterials(filters?: { category?: string; difficulty?: string; authorId?: string; fileType?: string }): Promise<TheoryMaterial[]> {
    let conditions = [];

    if (filters?.category) {
      conditions.push(eq(theoryMaterials.category, filters.category));
    }
    if (filters?.difficulty) {
      conditions.push(eq(theoryMaterials.difficulty, filters.difficulty));
    }
    if (filters?.authorId) {
      conditions.push(eq(theoryMaterials.authorId, filters.authorId));
    }
    if (filters?.fileType) {
      conditions.push(eq(theoryMaterials.fileType, filters.fileType));
    }

    if (conditions.length > 0) {
      return await db.select().from(theoryMaterials).where(and(...conditions)).orderBy(desc(theoryMaterials.createdAt));
    }

    return await db.select().from(theoryMaterials).orderBy(desc(theoryMaterials.createdAt));
  }

  async createTheoryMaterial(insertMaterial: InsertTheoryMaterial): Promise<TheoryMaterial> {
    const id = randomUUID();
    const material: TheoryMaterial = {
      ...insertMaterial,
      id,
      description: insertMaterial.description || null,
      fileSize: insertMaterial.fileSize || null,
      isPublished: insertMaterial.isPublished || false,
      viewCount: 0,
      downloadCount: 0,
      createdAt: Date.now(),
    };

    await db.insert(theoryMaterials).values(material);
    return material;
  }

  async updateTheoryMaterial(id: string, updates: Partial<TheoryMaterial>): Promise<TheoryMaterial | undefined> {
    await db.update(theoryMaterials).set(updates).where(eq(theoryMaterials.id, id));
    return this.getTheoryMaterial(id);
  }

  async deleteTheoryMaterial(id: string): Promise<boolean> {
    try {
      await db.delete(theoryMaterials).where(eq(theoryMaterials.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  async incrementTheoryMaterialView(id: string): Promise<boolean> {
    try {
      const material = await this.getTheoryMaterial(id);
      if (!material) return false;

      await db
        .update(theoryMaterials)
        .set({ viewCount: (material.viewCount || 0) + 1 })
        .where(eq(theoryMaterials.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  async incrementTheoryMaterialDownload(id: string): Promise<boolean> {
    try {
      const material = await this.getTheoryMaterial(id);
      if (!material) return false;

      await db
        .update(theoryMaterials)
        .set({ downloadCount: (material.downloadCount || 0) + 1 })
        .where(eq(theoryMaterials.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Erudit Game Session methods
  async getEruditSession(id: string): Promise<EruditSession | undefined> {
    const result = await db.select().from(eruditSessions).where(eq(eruditSessions.id, id)).limit(1);
    return result[0];
  }

  async getEruditSessions(filters?: { hostId?: string; status?: string }): Promise<EruditSession[]> {
    let conditions = [];

    if (filters?.hostId) {
      conditions.push(eq(eruditSessions.hostId, filters.hostId));
    }
    if (filters?.status) {
      conditions.push(eq(eruditSessions.status, filters.status));
    }

    if (conditions.length > 0) {
      return await db.select().from(eruditSessions).where(and(...conditions)).orderBy(desc(eruditSessions.createdAt));
    }

    return await db.select().from(eruditSessions).orderBy(desc(eruditSessions.createdAt));
  }

  async createEruditSession(insertSession: InsertEruditSession): Promise<EruditSession> {
    const id = randomUUID();
    const session: EruditSession = {
      ...insertSession,
      id,
      currentPlayer: 0,
      status: "waiting",
      totalMoves: 0,
      startedAt: insertSession.startedAt || null,
      finishedAt: insertSession.finishedAt || null,
      winnerIds: insertSession.winnerIds || null,
      createdAt: Date.now(),
    };

    await db.insert(eruditSessions).values(session);
    return session;
  }

  async updateEruditSession(id: string, updates: Partial<EruditSession>): Promise<EruditSession | undefined> {
    await db.update(eruditSessions).set(updates).where(eq(eruditSessions.id, id));
    return this.getEruditSession(id);
  }

  async joinEruditSession(sessionId: string, playerId: string): Promise<boolean> {
    try {
      const session = await this.getEruditSession(sessionId);
      if (!session) return false;

      // Update players array in session
      const players = JSON.parse(session.players || '[]') as any[];
      const existingPlayer = players.find((p: any) => p.id === playerId);

      if (!existingPlayer) {
        players.push({ id: playerId, letters: [], score: 0 });
        await db
          .update(eruditSessions)
          .set({ players: JSON.stringify(players) })
          .where(eq(eruditSessions.id, sessionId));
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteEruditSession(id: string): Promise<boolean> {
    try {
      await db.delete(eruditSessions).where(eq(eruditSessions.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Erudit Move methods
  async getEruditMove(id: string): Promise<EruditMove | undefined> {
    const result = await db.select().from(eruditMoves).where(eq(eruditMoves.id, id)).limit(1);
    return result[0];
  }

  async getEruditMovesBySession(sessionId: string): Promise<EruditMove[]> {
    return await db
      .select()
      .from(eruditMoves)
      .where(eq(eruditMoves.sessionId, sessionId))
      .orderBy(eruditMoves.moveNumber);
  }

  async createEruditMove(insertMove: InsertEruditMove): Promise<EruditMove> {
    const id = randomUUID();
    const move: EruditMove = {
      ...insertMove,
      id,
      boardState: insertMove.boardState || null,
      createdAt: Date.now(),
    };

    await db.insert(eruditMoves).values(move);
    return move;
  }

  async getEruditMovesByPlayer(playerId: string): Promise<EruditMove[]> {
    return await db
      .select()
      .from(eruditMoves)
      .where(eq(eruditMoves.playerId, playerId))
      .orderBy(desc(eruditMoves.createdAt));
  }

  // Avatar Request methods (implementing missing methods)
  async getAvatarRequest(id: string): Promise<AvatarRequest | undefined> {
    const result = await db.select().from(avatarRequests).where(eq(avatarRequests.id, id)).limit(1);
    return result[0];
  }

  async getAvatarRequests(status?: string): Promise<AvatarRequest[]> {
    if (status) {
      return await db.select().from(avatarRequests).where(eq(avatarRequests.status, status));
    }
    return await db.select().from(avatarRequests).orderBy(desc(avatarRequests.createdAt));
  }

  async createAvatarRequest(insertRequest: InsertAvatarRequest): Promise<AvatarRequest> {
    const id = randomUUID();
    const request: AvatarRequest = {
      ...insertRequest,
      id,
      status: insertRequest.status || "pending",
      rejectionReason: insertRequest.rejectionReason || null,
      reviewedBy: insertRequest.reviewedBy || null,
      reviewedAt: insertRequest.reviewedAt || null,
      createdAt: Date.now(),
    };

    await db.insert(avatarRequests).values(request);
    return request;
  }

  async updateAvatarRequest(id: string, updates: Partial<AvatarRequest>): Promise<AvatarRequest | undefined> {
    await db.update(avatarRequests).set(updates).where(eq(avatarRequests.id, id));
    return this.getAvatarRequest(id);
  }

  async getUserAvatarRequests(userId: string): Promise<AvatarRequest[]> {
    return await db
      .select()
      .from(avatarRequests)
      .where(eq(avatarRequests.userId, userId))
      .orderBy(desc(avatarRequests.createdAt));
  }

  async approveAvatarRequest(id: string, adminId: string): Promise<boolean> {
    try {
      const request = await this.getAvatarRequest(id);
      if (!request) return false;

      // Update avatar request status
      await db
        .update(avatarRequests)
        .set({
          status: "approved",
          reviewedBy: adminId,
          reviewedAt: Date.now()
        })
        .where(eq(avatarRequests.id, id));

      // Update user's avatar
      await db
        .update(users)
        .set({ avatar: request.avatarUrl })
        .where(eq(users.id, request.userId));

      return true;
    } catch (error) {
      console.error('Failed to approve avatar request:', error);
      return false;
    }
  }

  async rejectAvatarRequest(id: string, adminId: string, reason: string): Promise<boolean> {
    try {
      const request = await this.getAvatarRequest(id);
      if (!request) return false;

      // Update avatar request status
      await db
        .update(avatarRequests)
        .set({
          status: "rejected",
          reviewedBy: adminId,
          reviewedAt: Date.now(),
          rejectionReason: reason
        })
        .where(eq(avatarRequests.id, id));

      return true;
    } catch (error) {
      console.error('Failed to reject avatar request:', error);
      return false;
    }
  }

  // Content Filter methods (implementing missing methods)
  async getContentFilter(id: string): Promise<ContentFilter | undefined> {
    const result = await db.select().from(contentFilters).where(eq(contentFilters.id, id)).limit(1);
    return result[0];
  }

  async getContentFilters(filters?: { type?: string; category?: string; isActive?: boolean }): Promise<ContentFilter[]> {
    let conditions = [];

    if (filters?.type) {
      conditions.push(eq(contentFilters.type, filters.type));
    }
    if (filters?.category) {
      conditions.push(eq(contentFilters.category, filters.category));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(contentFilters.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      return await db.select().from(contentFilters).where(and(...conditions)).orderBy(desc(contentFilters.createdAt));
    }

    return await db.select().from(contentFilters).orderBy(desc(contentFilters.createdAt));
  }

  async createContentFilter(insertFilter: InsertContentFilter): Promise<ContentFilter> {
    const id = randomUUID();
    const filter: ContentFilter = {
      ...insertFilter,
      id,
      severity: insertFilter.severity || "medium",
      isActive: insertFilter.isActive ?? true,
      description: insertFilter.description || null,
      addedBy: insertFilter.addedBy || null,
      createdAt: Date.now(),
      updatedAt: null,
    };

    await db.insert(contentFilters).values(filter);
    return filter;
  }

  async updateContentFilter(id: string, updates: Partial<ContentFilter>): Promise<ContentFilter | undefined> {
    await db
      .update(contentFilters)
      .set({ 
        ...updates, 
        updatedAt: Date.now() 
      })
      .where(eq(contentFilters.id, id));

    return this.getContentFilter(id);
  }

  async deleteContentFilter(id: string): Promise<boolean> {
    try {
      await db.delete(contentFilters).where(eq(contentFilters.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Notifications methods
  async getNotification(id: string): Promise<DbNotification | undefined> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    return result[0];
  }

  async getNotificationsByUser(userId: string): Promise<DbNotification[]> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    return result;
  }

  async createNotification(insertNotification: InsertDbNotification): Promise<DbNotification> {
    const id = randomUUID();
    const notification: DbNotification = {
      ...insertNotification,
      id,
      isRead: insertNotification.isRead ?? false,
      data: insertNotification.data ?? null,
    };

    await db.insert(notifications).values(notification);
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    try {
      await db.delete(notifications).where(eq(notifications.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Daily Tasks methods
  async getDailyTask(id: string): Promise<DailyTask | undefined> {
    const result = await db.select().from(dailyTasks).where(eq(dailyTasks.id, id)).limit(1);
    return result[0];
  }

  async getDailyTasksByUser(userId: string, date?: string): Promise<DailyTask[]> {
    if (date) {
      return await db.select().from(dailyTasks)
        .where(and(eq(dailyTasks.userId, userId), eq(dailyTasks.date, date)))
        .orderBy(desc(dailyTasks.createdAt));
    }

    return await db.select().from(dailyTasks)
      .where(eq(dailyTasks.userId, userId))
      .orderBy(desc(dailyTasks.createdAt));
  }

  async createDailyTask(insertTask: InsertDailyTask): Promise<DailyTask> {
    const id = randomUUID();
    const task: DailyTask = {
      ...insertTask,
      id,
      taskData: insertTask.taskData || null,
      reward: insertTask.reward || null,
      isCompleted: false,
      completedAt: null,
      createdAt: Date.now(),
    };

    await db.insert(dailyTasks).values(task);
    return task;
  }

  async updateDailyTask(id: string, updates: Partial<DailyTask>): Promise<DailyTask | undefined> {
    await db.update(dailyTasks).set(updates).where(eq(dailyTasks.id, id));
    return this.getDailyTask(id);
  }

  async completeDailyTask(id: string): Promise<boolean> {
    try {
      await db
        .update(dailyTasks)
        .set({ 
          isCompleted: true, 
          completedAt: Date.now() 
        })
        .where(eq(dailyTasks.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  async generateDailyTasks(userId: string, date: string): Promise<DailyTask[]> {
    // Generate different types of daily tasks
    const taskTypes = [
      { type: 'lesson', data: { count: 1 }, reward: 15 },
      { type: 'game', data: { count: 2, types: ['word_memory', 'grammar_builder'] }, reward: 10 },
      { type: 'quiz', data: { count: 1 }, reward: 20 },
    ];

    const tasks: DailyTask[] = [];

    for (const taskType of taskTypes) {
      const task = await this.createDailyTask({
        userId,
        taskType: taskType.type,
        taskData: JSON.stringify(taskType.data),
        date,
        reward: taskType.reward,
      });
      tasks.push(task);
    }

    return tasks;
  }

  async getUserStreakData(userId: string): Promise<{ dailyStreak: number; weeklyStreak: number; monthlyStreak: number; bestStreak: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { dailyStreak: 0, weeklyStreak: 0, monthlyStreak: 0, bestStreak: 0 };
    }

    return {
      dailyStreak: user.streak || 0,
      weeklyStreak: user.weeklyStreak || 0,
      monthlyStreak: user.monthlyStreak || 0,
      bestStreak: user.bestStreak || 0,
    };
  }

  async updateUserStreak(userId: string, completed: boolean): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;

      const today = new Date().toISOString().split('T')[0];
      const lastStreakDate = user.lastStreakDate;

      let newStreak = user.streak || 0;
      let newWeeklyStreak = user.weeklyStreak || 0;
      let newMonthlyStreak = user.monthlyStreak || 0;
      let newBestStreak = user.bestStreak || 0;

      if (completed) {
        if (lastStreakDate !== today) {
          newStreak += 1;
          newWeeklyStreak += 1;
          newMonthlyStreak += 1;

          if (newStreak > newBestStreak) {
            newBestStreak = newStreak;
          }
        }
      } else {
        newStreak = 0;
      }

      await this.updateUser(userId, {
        streak: newStreak,
        weeklyStreak: newWeeklyStreak,
        monthlyStreak: newMonthlyStreak,
        bestStreak: newBestStreak,
        lastStreakDate: completed ? today : lastStreakDate,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // Friendships methods
  async getFriendship(id: string): Promise<Friendship | undefined> {
    const result = await db.select().from(friendships).where(eq(friendships.id, id)).limit(1);
    return result[0];
  }

  async getFriendshipByUsers(userId: string, friendId: string): Promise<Friendship | undefined> {
    const result = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.friendId, friendId)
        )
      )
      .limit(1);
    return result[0];
  }

  async getUserFriends(userId: string, status?: string): Promise<Friendship[]> {
    if (status) {
      return await db
        .select()
        .from(friendships)
        .where(and(eq(friendships.userId, userId), eq(friendships.status, status)))
        .orderBy(desc(friendships.createdAt));
    }

    return await db
      .select()
      .from(friendships)
      .where(eq(friendships.userId, userId))
      .orderBy(desc(friendships.createdAt));
  }

  async getUserFriendRequests(userId: string): Promise<Friendship[]> {
    const result = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, 'pending')
        )
      )
      .orderBy(desc(friendships.createdAt));
    return result;
  }

  async createFriendship(insertFriendship: InsertFriendship): Promise<Friendship> {
    const id = randomUUID();
    const friendship: Friendship = {
      ...insertFriendship,
      id,
      acceptedAt: null,
      blockedAt: null,
      createdAt: Date.now(),
    };

    await db.insert(friendships).values(friendship);
    return friendship;
  }

  async updateFriendship(id: string, updates: Partial<Friendship>): Promise<Friendship | undefined> {
    await db.update(friendships).set(updates).where(eq(friendships.id, id));
    return this.getFriendship(id);
  }

  async acceptFriendRequest(friendshipId: string): Promise<boolean> {
    try {
      await db
        .update(friendships)
        .set({ 
          status: 'accepted', 
          acceptedAt: Date.now() 
        })
        .where(eq(friendships.id, friendshipId));
      return true;
    } catch (error) {
      return false;
    }
  }

  async rejectFriendRequest(friendshipId: string): Promise<boolean> {
    try {
      await db.delete(friendships).where(eq(friendships.id, friendshipId));
      return true;
    } catch (error) {
      return false;
    }
  }

  async blockFriend(userId: string, friendId: string): Promise<boolean> {
    try {
      // Find existing friendship
      const friendship = await this.getFriendshipByUsers(userId, friendId);

      if (friendship) {
        await db
          .update(friendships)
          .set({ 
            status: 'blocked', 
            blockedAt: Date.now() 
          })
          .where(eq(friendships.id, friendship.id));
      } else {
        // Create new blocked relationship
        await this.createFriendship({
          userId,
          friendId,
          status: 'blocked',
          requestedBy: userId,
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFriendLeaderboard(userId: string): Promise<{ user: User; score: number; rank: number }[]> {
    // Get user's friends
    const friends = await this.getUserFriends(userId, 'accepted');
    const friendIds = friends.map(f => f.friendId);

    if (friendIds.length === 0) {
      return [];
    }

    // Get friends' data and sort by experience
    const friendsData: { user: User; score: number; rank: number }[] = [];

    for (const friendId of friendIds) {
      const friend = await this.getUser(friendId);
      if (friend) {
        friendsData.push({
          user: friend,
          score: friend.experience || 0,
          rank: 0, // Will be set below
        });
      }
    }

    // Sort by score and assign ranks
    friendsData.sort((a, b) => b.score - a.score);
    friendsData.forEach((friend, index) => {
      friend.rank = index + 1;
    });

    return friendsData;
  }

  // Custom Themes
  async getCustomTheme(id: string): Promise<CustomTheme | undefined> {
    try {
      const result = await db.select().from(customThemes).where(eq(customThemes.id, id)).limit(1);
      return result[0];
    } catch (error) {
      return undefined;
    }
  }

  async getCustomThemes(filters?: { authorId?: string; isPublic?: boolean; isActive?: boolean }): Promise<CustomTheme[]> {
    try {
      const conditions = [];

      if (filters?.authorId) {
        conditions.push(eq(customThemes.authorId, filters.authorId));
      }
      if (filters?.isPublic !== undefined) {
        conditions.push(eq(customThemes.isPublic, filters.isPublic));
      }
      if (filters?.isActive !== undefined) {
        conditions.push(eq(customThemes.isActive, filters.isActive));
      }

      if (conditions.length > 0) {
        return await db.select().from(customThemes).where(and(...conditions));
      }
      return await db.select().from(customThemes);
    } catch (error) {
      return [];
    }
  }

  async createCustomTheme(theme: InsertCustomTheme): Promise<CustomTheme> {
    const id = crypto.randomUUID();
    const now = Date.now();

    const newTheme = {
      ...theme,
      id,
      description: theme.description || null,
      isPublic: theme.isPublic || false,
      isActive: theme.isActive || true,
      tags: theme.tags || null,
      gradients: theme.gradients || null,
      animations: theme.animations || null,
      backgroundUrl: theme.backgroundUrl || null,
      previewUrl: theme.previewUrl || null,
      createdAt: now,
      updatedAt: now,
      downloadCount: 0,
      rating: 0,
    };

    await db.insert(customThemes).values(newTheme);
    return newTheme;
  }

  async updateCustomTheme(id: string, updates: Partial<CustomTheme>): Promise<CustomTheme | undefined> {
    try {
      await db
        .update(customThemes)
        .set({ ...updates, updatedAt: Date.now() })
        .where(eq(customThemes.id, id));

      return await this.getCustomTheme(id);
    } catch (error) {
      return undefined;
    }
  }

  async deleteCustomTheme(id: string): Promise<boolean> {
    try {
      await db.delete(customThemes).where(eq(customThemes.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  // User Theme Settings
  async getUserThemeSettings(userId: string): Promise<UserThemeSettings | undefined> {
    try {
      const result = await db.select().from(userThemeSettings).where(eq(userThemeSettings.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      return undefined;
    }
  }

  async updateUserThemeSettings(userId: string, settings: Partial<UserThemeSettings>): Promise<UserThemeSettings> {
    const existing = await this.getUserThemeSettings(userId);

    if (existing) {
      await db
        .update(userThemeSettings)
        .set({ ...settings, updatedAt: Date.now() })
        .where(eq(userThemeSettings.userId, userId));

      return { ...existing, ...settings, updatedAt: Date.now() };
    } else {
      const id = crypto.randomUUID();
      const newSettings = {
        id,
        userId,
        ...settings,
        updatedAt: Date.now(),
      };

      await db.insert(userThemeSettings).values(newSettings);
      return newSettings as UserThemeSettings;
    }
  }

  // Video Conferences
  async getVideoConference(id: string): Promise<VideoConference | undefined> {
    try {
      const result = await db.select().from(videoConferences).where(eq(videoConferences.id, id)).limit(1);
      return result[0];
    } catch (error) {
      return undefined;
    }
  }

  async getVideoConferences(filters?: { hostId?: string; status?: string }): Promise<VideoConference[]> {
    try {
      const conditions = [];

      if (filters?.hostId) {
        conditions.push(eq(videoConferences.hostId, filters.hostId));
      }
      if (filters?.status) {
        conditions.push(eq(videoConferences.status, filters.status));
      }

      if (conditions.length > 0) {
        return await db.select().from(videoConferences).where(and(...conditions));
      }
      return await db.select().from(videoConferences);
    } catch (error) {
      return [];
    }
  }

  async createVideoConference(conference: InsertVideoConference): Promise<VideoConference> {
    const id = crypto.randomUUID();
    const now = Date.now();

    const newConference = {
      ...conference,
      id,
      description: conference.description || null,
      type: conference.type || 'lesson',
      status: conference.status || 'scheduled',
      scheduledAt: conference.scheduledAt || null,
      startedAt: null,
      endedAt: null,
      maxParticipants: conference.maxParticipants || 10,
      recordingUrl: conference.recordingUrl || null,
      settings: conference.settings || null,
      whiteboardData: conference.whiteboardData || null,
      chatHistory: conference.chatHistory || null,
      createdAt: now,
    };

    await db.insert(videoConferences).values(newConference);
    return newConference;
  }

  async updateVideoConference(id: string, updates: Partial<VideoConference>): Promise<VideoConference | undefined> {
    try {
      await db
        .update(videoConferences)
        .set(updates)
        .where(eq(videoConferences.id, id));

      return await this.getVideoConference(id);
    } catch (error) {
      return undefined;
    }
  }

  async joinVideoConference(conferenceId: string, userId: string): Promise<boolean> {
    try {
      const conference = await this.getVideoConference(conferenceId);
      if (!conference) return false;

      const participants = JSON.parse(conference.participants || '[]');
      if (!participants.includes(userId)) {
        participants.push(userId);

        await db
          .update(videoConferences)
          .set({ participants: JSON.stringify(participants) })
          .where(eq(videoConferences.id, conferenceId));
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async leaveVideoConference(conferenceId: string, userId: string): Promise<boolean> {
    try {
      const conference = await this.getVideoConference(conferenceId);
      if (!conference) return false;

      const participants = JSON.parse(conference.participants || '[]');
      const updatedParticipants = participants.filter((id: string) => id !== userId);

      await db
        .update(videoConferences)
        .set({ participants: JSON.stringify(updatedParticipants) })
        .where(eq(videoConferences.id, conferenceId));

      return true;
    } catch (error) {
      return false;
    }
  }

  // Payment Plans
  async getPaymentPlan(id: string): Promise<PaymentPlan | undefined> {
    try {
      const result = await db.select().from(paymentPlans).where(eq(paymentPlans.id, id)).limit(1);
      return result[0];
    } catch (error) {
      return undefined;
    }
  }

  async getPaymentPlans(filters?: { type?: string; isActive?: boolean }): Promise<PaymentPlan[]> {
    try {
      const conditions = [];

      if (filters?.type) {
        conditions.push(eq(paymentPlans.type, filters.type));
      }
      if (filters?.isActive !== undefined) {
        conditions.push(eq(paymentPlans.isActive, filters.isActive));
      }

      if (conditions.length > 0) {
        return await db.select().from(paymentPlans).where(and(...conditions));
      }
      return await db.select().from(paymentPlans);
    } catch (error) {
      return [];
    }
  }

  async createPaymentPlan(plan: InsertPaymentPlan): Promise<PaymentPlan> {
    const id = crypto.randomUUID();
    const now = Date.now();

    const newPlan = {
      ...plan,
      id,
      description: plan.description || null,
      duration: plan.duration || null,
      currency: plan.currency || 'RUB',
      isActive: plan.isActive || true,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(paymentPlans).values(newPlan);
    return newPlan;
  }

  async updatePaymentPlan(id: string, updates: Partial<PaymentPlan>): Promise<PaymentPlan | undefined> {
    try {
      await db
        .update(paymentPlans)
        .set({ ...updates, updatedAt: Date.now() })
        .where(eq(paymentPlans.id, id));

      return await this.getPaymentPlan(id);
    } catch (error) {
      return undefined;
    }
  }

  // Payment Transactions
  async getPaymentTransaction(id: string): Promise<PaymentTransaction | undefined> {
    try {
      const result = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id)).limit(1);
      return result[0];
    } catch (error) {
      return undefined;
    }
  }

  async getUserPaymentTransactions(userId: string): Promise<PaymentTransaction[]> {
    try {
      return await db.select().from(paymentTransactions).where(eq(paymentTransactions.userId, userId));
    } catch (error) {
      return [];
    }
  }

  async createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const id = crypto.randomUUID();
    const now = Date.now();

    const newTransaction = {
      ...transaction,
      id,
      planId: transaction.planId || null,
      currency: transaction.currency || 'RUB',
      status: transaction.status || 'pending',
      transactionId: transaction.transactionId || null,
      description: transaction.description || null,
      metadata: transaction.metadata || null,
      paidAt: null,
      refundedAt: null,
      createdAt: now,
    };

    await db.insert(paymentTransactions).values(newTransaction);
    return newTransaction;
  }

  async updatePaymentTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction | undefined> {
    try {
      await db
        .update(paymentTransactions)
        .set(updates)
        .where(eq(paymentTransactions.id, id));

      return await this.getPaymentTransaction(id);
    } catch (error) {
      return undefined;
    }
  }

}