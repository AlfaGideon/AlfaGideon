import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password"),
  role: text("role").notNull().default("student"), // student, tutor, admin, parent
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  avatar: text("avatar"),
  level: integer("level").default(1),
  experience: integer("experience").default(0),
  streak: integer("streak").default(0),
  weeklyStreak: integer("weekly_streak").default(0),
  monthlyStreak: integer("monthly_streak").default(0),
  bestStreak: integer("best_streak").default(0),
  lastStreakDate: text("last_streak_date"), // YYYY-MM-DD format
  lastActivity: integer("last_activity"), // Unix timestamp
  isOnline: integer("is_online", { mode: 'boolean' }).default(false),
  // Telegram integration fields
  telegramId: text("telegram_id").unique(),
  telegramUsername: text("telegram_username"),
  telegramChatId: text("telegram_chat_id"),
  telegramAuthDate: integer("telegram_auth_date"), // Unix timestamp
  telegramHash: text("telegram_hash"),
  // Additional fields for tutors/admins
  subjects: text("subjects"), // JSON string - array of subjects for tutors
  isBlocked: integer("is_blocked", { mode: 'boolean' }).default(false),
  blockedAt: integer("blocked_at"), // Unix timestamp
  blockedBy: text("blocked_by"),
  blockReason: text("block_reason"),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  duration: integer("duration"), // in minutes
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  category: text("category").notNull(),
  content: text("content"), // JSON string - lesson content, exercises
  isPublished: integer("is_published", { mode: 'boolean' }).default(false),
  authorId: text("author_id").references(() => users.id),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

export const userProgress = sqliteTable("user_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  lessonId: text("lesson_id").references(() => lessons.id).notNull(),
  completed: integer("completed", { mode: 'boolean' }).default(false),
  progress: integer("progress").default(0), // percentage
  score: integer("score"),
  timeSpent: integer("time_spent"), // in seconds
  completedAt: integer("completed_at"), // Unix timestamp
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

export const games = sqliteTable("games", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // word_memory, grammar_builder, pronunciation, speed_reading, culture_quiz, erudit, vowel_spelling, word_flash, grammar_sprint, accent_quiz
  title: text("title").notNull(),
  description: text("description"),
  difficulty: text("difficulty").notNull(),
  config: text("config"), // JSON string - game configuration
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

export const gameScores = sqliteTable("game_scores", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  gameId: text("game_id").references(() => games.id).notNull(),
  score: integer("score").notNull(),
  duration: integer("duration"), // in seconds
  accuracy: integer("accuracy"), // percentage
  level: integer("level"),
  playedAt: integer("played_at").notNull(), // Unix timestamp
});

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  studentId: text("student_id").references(() => users.id).notNull(),
  tutorId: text("tutor_id").references(() => users.id).notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").references(() => chats.id).notNull(),
  senderId: text("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: text("type").default("text"), // text, image, file, audio
  metadata: text("metadata"), // JSON string - additional message data
  audioUrl: text("audio_url"),
  audioDuration: integer("audio_duration"), // in seconds
  audioTranscript: text("audio_transcript"), // voice transcription
  isRead: integer("is_read", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

export const achievements = sqliteTable("achievements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  condition: text("condition"), // JSON string - achievement unlock condition
  points: integer("points").default(0),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

export const userAchievements = sqliteTable("user_achievements", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  achievementId: text("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: integer("unlocked_at"), // Unix timestamp
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'message', 'achievement', 'system', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data"), // JSON string for additional data
  isRead: integer("is_read", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

export const quizzes = sqliteTable("quizzes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  questions: text("questions").notNull(), // JSON string
  difficulty: text("difficulty").notNull(),
  category: text("category").notNull(),
  authorId: text("author_id").references(() => users.id),
  isPublished: integer("is_published", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

export const quizAttempts = sqliteTable("quiz_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  quizId: text("quiz_id").references(() => quizzes.id).notNull(),
  answers: text("answers").notNull(), // JSON string
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  timeSpent: integer("time_spent"), // in seconds
  completedAt: integer("completed_at"), // Unix timestamp
});

// Telegram sync table for message synchronization
export const telegramMessages = sqliteTable("telegram_messages", {
  id: text("id").primaryKey(),
  telegramMessageId: integer("telegram_message_id").notNull(),
  chatId: text("chat_id").references(() => chats.id),
  userId: text("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: text("type").default("text"), // text, image, file, audio, video
  isFromTelegram: integer("is_from_telegram", { mode: 'boolean' }).default(true),
  telegramChatId: text("telegram_chat_id").notNull(),
  syncedAt: integer("synced_at"), // Unix timestamp
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

// Admin logs for tracking administrative actions
export const adminLogs = sqliteTable("admin_logs", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // block_user, unblock_user, delete_message, etc.
  targetType: text("target_type").notNull(), // user, message, lesson, etc.
  targetId: text("target_id").notNull(),
  details: text("details"), // JSON string - additional action details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

// System settings table
export const systemSettings = sqliteTable("system_settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: text("category").notNull(), // telegram, admin, system, etc.
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: integer("updated_at"), // Unix timestamp
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

// Tutor-student assignments
export const tutorStudents = sqliteTable("tutor_students", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").references(() => users.id).notNull(),
  studentId: text("student_id").references(() => users.id).notNull(),
  assignedAt: integer("assigned_at"), // Unix timestamp
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

// Theory materials table
export const theoryMaterials = sqliteTable("theory_materials", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // audio, photo, video, document
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"), // in bytes
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  authorId: text("author_id").references(() => users.id).notNull(),
  isPublished: integer("is_published", { mode: 'boolean' }).default(false),
  viewCount: integer("view_count").default(0),
  downloadCount: integer("download_count").default(0),
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

// Эрудит game sessions
export const eruditSessions = sqliteTable("erudit_sessions", {
  id: text("id").primaryKey(),
  hostId: text("host_id").references(() => users.id).notNull(),
  players: text("players").notNull(), // JSON string - array of player objects
  gameState: text("game_state").notNull(), // JSON string - current board state
  currentPlayer: integer("current_player").default(0),
  status: text("status").notNull().default("waiting"), // waiting, active, finished
  totalMoves: integer("total_moves").default(0),
  startedAt: integer("started_at"), // Unix timestamp
  finishedAt: integer("finished_at"), // Unix timestamp
  winnerIds: text("winner_ids"), // JSON string - array of winner IDs
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

// Эрудит game moves/words
export const eruditMoves = sqliteTable("erudit_moves", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").references(() => eruditSessions.id).notNull(),
  playerId: text("player_id").references(() => users.id).notNull(),
  word: text("word").notNull(),
  letters: text("letters").notNull(), // JSON string - array of letter objects with positions
  score: integer("score").notNull(),
  moveNumber: integer("move_number").notNull(),
  boardState: text("board_state"), // JSON string - board state after this move
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

// Content validation function
export function validateContent(text: string, customFilters?: ContentFilter[]): { isValid: boolean; reason?: string } {
  // Basic character validation - only allow letters, numbers, spaces, hyphens, underscores
  const allowedPattern = /^[а-яёА-ЯЁa-zA-Z0-9\s\-_]+$/;
  
  if (!allowedPattern.test(text)) {
    return { isValid: false, reason: 'Недопустимые символы. Разрешены только буквы, цифры, пробелы, дефисы и подчеркивания' };
  }

  // Default prohibited words and patterns (fallback if no custom filters)
  const defaultProhibited = [
    // Нецензурные слова
    'блядь', 'блять', 'сука', 'пизда', 'хуй', 'ебать', 'ебать', 'дерьмо', 'гавно', 'сраный',
    // Половые органы
    'пенис', 'вагина', 'половой', 'член', 'пися', 'письку', 'писька', 'жопа', 'попа',
    // Сексуальные термины
    'секс', 'ебля', 'трах', 'порно', 'эротика', 'интим'
  ];
  
  const lowerText = text.toLowerCase();
  
  // Use custom filters if provided, otherwise use default
  const filtersToCheck = customFilters?.filter(f => f.isActive) || [];
  
  if (filtersToCheck.length > 0) {
    for (const filter of filtersToCheck) {
      if (filter.type === 'word' && lowerText.includes(filter.value.toLowerCase())) {
        return { isValid: false, reason: 'Недопустимое содержание' };
      }
      if (filter.type === 'symbol' && text.includes(filter.value)) {
        return { isValid: false, reason: 'Недопустимые символы' };
      }
      if (filter.type === 'pattern') {
        try {
          const regex = new RegExp(filter.value, 'i');
          if (regex.test(text)) {
            return { isValid: false, reason: 'Недопустимое содержание' };
          }
        } catch (e) {
          // Invalid regex pattern, skip
          continue;
        }
      }
    }
  } else {
    // Fallback to default filters
    for (const word of defaultProhibited) {
      if (lowerText.includes(word)) {
        return { isValid: false, reason: 'Недопустимое содержание' };
      }
    }
  }
  
  return { isValid: true };
}

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
}).extend({
  subjects: z.array(z.string()).optional().transform((arr) => 
    arr && arr.length > 0 ? JSON.stringify(arr) : undefined
  ),
}).refine(
  (data) => {
    const usernameCheck = validateContent(data.username);
    if (!usernameCheck.isValid) return false;
    
    const firstNameCheck = validateContent(data.firstName);
    if (!firstNameCheck.isValid) return false;
    
    const lastNameCheck = validateContent(data.lastName);
    if (!lastNameCheck.isValid) return false;
    
    return true;
  },
  {
    message: "Имя пользователя, имя или фамилия содержат недопустимые символы или слова",
  }
);

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  createdAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
});

export const insertGameScoreSchema = createInsertSchema(gameScores).omit({
  id: true,
  playedAt: true,
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  completedAt: true,
});

export const insertTelegramMessageSchema = createInsertSchema(telegramMessages).omit({
  id: true,
  syncedAt: true,
  createdAt: true,
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
  createdAt: true,
});

export const insertTutorStudentSchema = createInsertSchema(tutorStudents).omit({
  id: true,
  assignedAt: true,
  createdAt: true,
});

export const insertTheoryMaterialSchema = createInsertSchema(theoryMaterials).omit({
  id: true,
  createdAt: true,
});

export const insertEruditSessionSchema = createInsertSchema(eruditSessions).omit({
  id: true,
  createdAt: true,
});

export const insertEruditMoveSchema = createInsertSchema(eruditMoves).omit({
  id: true,
  createdAt: true,
});

// Avatar moderation requests table
export const avatarRequests = sqliteTable("avatar_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  avatarUrl: text("avatar_url").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  rejectionReason: text("rejection_reason"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: integer("reviewed_at"), // Unix timestamp
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

// Daily tasks for user motivation
export const dailyTasks = sqliteTable("daily_tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  taskType: text("task_type").notNull(), // "lesson", "game", "quiz", "chat"
  taskData: text("task_data"), // JSON string - specific task requirements
  isCompleted: integer("is_completed", { mode: 'boolean' }).default(false),
  date: text("date").notNull(), // YYYY-MM-DD
  reward: integer("reward").default(10), // experience points
  completedAt: integer("completed_at"), // Unix timestamp
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

// Custom Themes
export const customThemes = sqliteTable("custom_themes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  authorId: text("author_id").references(() => users.id).notNull(),
  colorScheme: text("color_scheme").notNull(), // JSON string with color values
  gradients: text("gradients"), // JSON string with gradient definitions
  animations: text("animations"), // JSON string with animation settings
  backgroundType: text("background_type").notNull().default("static"), // static, animated, video
  backgroundUrl: text("background_url"),
  isPublic: integer("is_public", { mode: 'boolean' }).default(false),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  downloadCount: integer("download_count").default(0),
  rating: integer("rating").default(0), // Average rating * 100
  tags: text("tags"), // JSON array of tags
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

// User Theme Settings
export const userThemeSettings = sqliteTable("user_theme_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull().unique(),
  activeThemeId: text("active_theme_id").references(() => customThemes.id),
  customSettings: text("custom_settings"), // JSON string with personalized settings
  animationsEnabled: integer("animations_enabled", { mode: 'boolean' }).default(true),
  backgroundEffects: integer("background_effects", { mode: 'boolean' }).default(true),
  updatedAt: integer("updated_at"),
});

// Video Conferences
export const videoConferences = sqliteTable("video_conferences", {
  id: text("id").primaryKey(),
  hostId: text("host_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  participants: text("participants").notNull(), // JSON array of user IDs
  type: text("type").notNull().default("lesson"), // lesson, group_lesson, simple_call
  status: text("status").notNull().default("scheduled"), // scheduled, active, ended, cancelled
  scheduledAt: integer("scheduled_at"),
  startedAt: integer("started_at"),
  endedAt: integer("ended_at"),
  maxParticipants: integer("max_participants").default(10),
  recordingUrl: text("recording_url"),
  settings: text("settings"), // JSON string with conference settings
  whiteboardData: text("whiteboard_data"), // JSON string with board state
  chatHistory: text("chat_history"), // JSON array of chat messages
  createdAt: integer("created_at").notNull(),
});

// Payment Plans
export const paymentPlans = sqliteTable("payment_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // individual, group, subscription
  price: integer("price").notNull(), // Price in kopecks
  currency: text("currency").notNull().default("RUB"),
  duration: integer("duration"), // Duration in minutes for lessons
  features: text("features").notNull(), // JSON array of features
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

// Payment Transactions
export const paymentTransactions = sqliteTable("payment_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  planId: text("plan_id").references(() => paymentPlans.id),
  amount: integer("amount").notNull(), // Amount in kopecks
  currency: text("currency").notNull().default("RUB"),
  status: text("status").notNull().default("pending"), // pending, completed, failed, refunded
  paymentMethod: text("payment_method").notNull(), // tbank, stripe, etc
  transactionId: text("transaction_id"),
  description: text("description"),
  metadata: text("metadata"), // JSON string with payment details
  paidAt: integer("paid_at"),
  refundedAt: integer("refunded_at"),
  createdAt: integer("created_at").notNull(),
});

// Friendships system
export const friendships = sqliteTable("friendships", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  friendId: text("friend_id").references(() => users.id).notNull(),
  status: text("status").notNull(), // "pending", "accepted", "blocked"
  requestedBy: text("requested_by").references(() => users.id).notNull(),
  acceptedAt: integer("accepted_at"), // Unix timestamp
  blockedAt: integer("blocked_at"), // Unix timestamp
  createdAt: integer("created_at").notNull(), // Unix timestamp
});

// Content moderation filters table
export const contentFilters = sqliteTable("content_filters", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // word, symbol, pattern
  value: text("value").notNull(),
  category: text("category").notNull(), // profanity, sexual, inappropriate_symbols
  severity: text("severity").notNull().default("medium"), // low, medium, high
  description: text("description"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  addedBy: text("added_by").references(() => users.id),
  createdAt: integer("created_at").notNull(), // Unix timestamp
  updatedAt: integer("updated_at"), // Unix timestamp
});

export const insertAvatarRequestSchema = createInsertSchema(avatarRequests).omit({
  id: true,
  createdAt: true,
});

export const insertContentFilterSchema = createInsertSchema(contentFilters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailyTaskSchema = createInsertSchema(dailyTasks).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  acceptedAt: true,
  blockedAt: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type GameScore = typeof gameScores.$inferSelect;
export type InsertGameScore = z.infer<typeof insertGameScoreSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type TelegramMessage = typeof telegramMessages.$inferSelect;
export type InsertTelegramMessage = z.infer<typeof insertTelegramMessageSchema>;
export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type TutorStudent = typeof tutorStudents.$inferSelect;
export type InsertTutorStudent = z.infer<typeof insertTutorStudentSchema>;
export type TheoryMaterial = typeof theoryMaterials.$inferSelect;
export type InsertTheoryMaterial = z.infer<typeof insertTheoryMaterialSchema>;
export type EruditSession = typeof eruditSessions.$inferSelect;
export type InsertEruditSession = z.infer<typeof insertEruditSessionSchema>;
export type EruditMove = typeof eruditMoves.$inferSelect;
export type InsertEruditMove = z.infer<typeof insertEruditMoveSchema>;
export type AvatarRequest = typeof avatarRequests.$inferSelect;
export type InsertAvatarRequest = z.infer<typeof insertAvatarRequestSchema>;
export type ContentFilter = typeof contentFilters.$inferSelect;
export type InsertContentFilter = z.infer<typeof insertContentFilterSchema>;

export type Notification = typeof notifications.$inferSelect;
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertDailyTask = z.infer<typeof insertDailyTaskSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;

// New schema types for enhanced features
export type CustomTheme = typeof customThemes.$inferSelect;
export const insertCustomThemeSchema = createInsertSchema(customThemes).omit({ id: true, createdAt: true, updatedAt: true, downloadCount: true, rating: true });
export type InsertCustomTheme = z.infer<typeof insertCustomThemeSchema>;

export type UserThemeSettings = typeof userThemeSettings.$inferSelect;
export const insertUserThemeSettingsSchema = createInsertSchema(userThemeSettings).omit({ id: true, updatedAt: true });
export type InsertUserThemeSettings = z.infer<typeof insertUserThemeSettingsSchema>;

export type VideoConference = typeof videoConferences.$inferSelect;
export const insertVideoConferenceSchema = createInsertSchema(videoConferences).omit({ id: true, createdAt: true, startedAt: true, endedAt: true });
export type InsertVideoConference = z.infer<typeof insertVideoConferenceSchema>;

export type PaymentPlan = typeof paymentPlans.$inferSelect;
export const insertPaymentPlanSchema = createInsertSchema(paymentPlans).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentPlan = z.infer<typeof insertPaymentPlanSchema>;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({ id: true, createdAt: true, paidAt: true, refundedAt: true });
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;