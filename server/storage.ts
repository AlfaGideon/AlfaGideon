import {
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
  type Notification,
  type InsertNotification,
  type InsertContentFilter,
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

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersBySubjects(subjects: string[]): Promise<User[]>;
  getUsersCount(): Promise<number>;
  getAllUsers(): Promise<User[]>;
  searchUsers(search: string): Promise<User[]>;

  // Lessons
  getLesson(id: string): Promise<Lesson | undefined>;
  getLessons(filters?: { difficulty?: string; category?: string; authorId?: string }): Promise<Lesson[]>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined>;
  deleteLesson(id: string): Promise<boolean>;

  // User Progress
  getUserProgress(userId: string, lessonId: string): Promise<UserProgress | undefined>;
  getUserProgressByUser(userId: string): Promise<UserProgress[]>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateUserProgress(id: string, updates: Partial<UserProgress>): Promise<UserProgress | undefined>;

  // Games
  getGame(id: string): Promise<Game | undefined>;
  getGames(type?: string): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined>;

  // Game Scores
  getGameScore(id: string): Promise<GameScore | undefined>;
  getGameScoresByUser(userId: string): Promise<GameScore[]>;
  getGameScoresByGame(gameId: string): Promise<GameScore[]>;
  createGameScore(score: InsertGameScore): Promise<GameScore>;
  getLeaderboard(gameId?: string, limit?: number): Promise<GameScore[]>;

  // Chats
  getChat(id: string): Promise<Chat | undefined>;
  getChatByUsers(studentId: string, tutorId: string): Promise<Chat | undefined>;
  getChatsByUser(userId: string): Promise<Chat[]>;
  createChat(chat: InsertChat): Promise<Chat>;

  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByChat(chatId: string, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<boolean>;

  // Achievements
  getAchievement(id: string): Promise<Achievement | undefined>;
  getAchievements(): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<UserAchievement[]>;
  createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;

  // Quizzes
  getQuiz(id: string): Promise<Quiz | undefined>;
  getQuizzes(filters?: { difficulty?: string; category?: string; authorId?: string }): Promise<Quiz[]>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: string, updates: Partial<Quiz>): Promise<Quiz | undefined>;
  deleteQuiz(id: string): Promise<boolean>;

  // Quiz Attempts
  getQuizAttempt(id: string): Promise<QuizAttempt | undefined>;
  getQuizAttemptsByUser(userId: string): Promise<QuizAttempt[]>;
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;

  // Telegram Integration
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  updateUserTelegramData(userId: string, telegramData: Partial<User>): Promise<User | undefined>;
  
  // Telegram Messages
  getTelegramMessage(id: string): Promise<TelegramMessage | undefined>;
  getTelegramMessagesByChat(telegramChatId: string): Promise<TelegramMessage[]>;
  createTelegramMessage(message: InsertTelegramMessage): Promise<TelegramMessage>;
  syncTelegramMessage(telegramMessageId: number, chatId: string): Promise<boolean>;

  // Admin Functions
  createAdminLog(log: InsertAdminLog): Promise<AdminLog>;
  getAdminLogs(adminId?: string, limit?: number): Promise<AdminLog[]>;
  blockUser(userId: string, adminId: string, reason?: string): Promise<boolean>;
  unblockUser(userId: string, adminId: string): Promise<boolean>;
  
  // System Settings
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getSystemSettings(category?: string): Promise<SystemSetting[]>;
  setSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, value: string, updatedBy: string): Promise<SystemSetting | undefined>;
  
  // Tutor-Student Management
  getTutorStudents(tutorId: string): Promise<TutorStudent[]>;
  getStudentTutors(studentId: string): Promise<TutorStudent[]>;
  assignTutorToStudent(assignment: InsertTutorStudent): Promise<TutorStudent>;
  unassignTutorFromStudent(tutorId: string, studentId: string): Promise<boolean>;

  // Theory Materials
  getTheoryMaterial(id: string): Promise<TheoryMaterial | undefined>;
  getTheoryMaterials(filters?: { category?: string; difficulty?: string; authorId?: string; fileType?: string }): Promise<TheoryMaterial[]>;
  createTheoryMaterial(material: InsertTheoryMaterial): Promise<TheoryMaterial>;
  updateTheoryMaterial(id: string, updates: Partial<TheoryMaterial>): Promise<TheoryMaterial | undefined>;
  deleteTheoryMaterial(id: string): Promise<boolean>;
  incrementTheoryMaterialView(id: string): Promise<boolean>;
  incrementTheoryMaterialDownload(id: string): Promise<boolean>;

  // Эрудит Game Sessions
  getEruditSession(id: string): Promise<EruditSession | undefined>;
  getEruditSessions(filters?: { hostId?: string; status?: string }): Promise<EruditSession[]>;
  createEruditSession(session: InsertEruditSession): Promise<EruditSession>;
  updateEruditSession(id: string, updates: Partial<EruditSession>): Promise<EruditSession | undefined>;
  joinEruditSession(sessionId: string, playerId: string): Promise<boolean>;
  deleteEruditSession(id: string): Promise<boolean>;

  // Эрудит Game Moves
  getEruditMove(id: string): Promise<EruditMove | undefined>;
  getEruditMovesBySession(sessionId: string): Promise<EruditMove[]>;
  createEruditMove(move: InsertEruditMove): Promise<EruditMove>;
  getEruditMovesByPlayer(playerId: string): Promise<EruditMove[]>;

  // Avatar Requests
  getAvatarRequest(id: string): Promise<AvatarRequest | undefined>;
  getAvatarRequests(status?: string): Promise<AvatarRequest[]>;
  createAvatarRequest(request: InsertAvatarRequest): Promise<AvatarRequest>;
  updateAvatarRequest(id: string, updates: Partial<AvatarRequest>): Promise<AvatarRequest | undefined>;
  getUserAvatarRequests(userId: string): Promise<AvatarRequest[]>;
  approveAvatarRequest(id: string, adminId: string): Promise<boolean>;
  rejectAvatarRequest(id: string, adminId: string, reason: string): Promise<boolean>;

  // Content Filters
  getContentFilter(id: string): Promise<ContentFilter | undefined>;
  getContentFilters(filters?: { type?: string; category?: string; isActive?: boolean }): Promise<ContentFilter[]>;
  createContentFilter(filter: InsertContentFilter): Promise<ContentFilter>;
  updateContentFilter(id: string, updates: Partial<ContentFilter>): Promise<ContentFilter | undefined>;
  deleteContentFilter(id: string): Promise<boolean>;

  // Notifications
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  deleteNotification(id: string): Promise<boolean>;

  // Daily Tasks
  getDailyTask(id: string): Promise<DailyTask | undefined>;
  getDailyTasksByUser(userId: string, date?: string): Promise<DailyTask[]>;
  createDailyTask(task: InsertDailyTask): Promise<DailyTask>;
  updateDailyTask(id: string, updates: Partial<DailyTask>): Promise<DailyTask | undefined>;
  completeDailyTask(id: string): Promise<boolean>;
  generateDailyTasks(userId: string, date: string): Promise<DailyTask[]>;
  getUserStreakData(userId: string): Promise<{ dailyStreak: number; weeklyStreak: number; monthlyStreak: number; bestStreak: number }>;
  updateUserStreak(userId: string, completed: boolean): Promise<boolean>;

  // Friendships
  getFriendship(id: string): Promise<Friendship | undefined>;
  getFriendshipByUsers(userId: string, friendId: string): Promise<Friendship | undefined>;
  getUserFriends(userId: string, status?: string): Promise<Friendship[]>;
  getUserFriendRequests(userId: string): Promise<Friendship[]>;
  createFriendship(friendship: InsertFriendship): Promise<Friendship>;
  updateFriendship(id: string, updates: Partial<Friendship>): Promise<Friendship | undefined>;
  acceptFriendRequest(friendshipId: string): Promise<boolean>;
  rejectFriendRequest(friendshipId: string): Promise<boolean>;
  blockFriend(userId: string, friendId: string): Promise<boolean>;
  getFriendLeaderboard(userId: string): Promise<{ user: User; score: number; rank: number }[]>;

  // Custom Themes
  getCustomTheme(id: string): Promise<CustomTheme | undefined>;
  getCustomThemes(filters?: { authorId?: string; isPublic?: boolean; isActive?: boolean }): Promise<CustomTheme[]>;
  createCustomTheme(theme: InsertCustomTheme): Promise<CustomTheme>;
  updateCustomTheme(id: string, updates: Partial<CustomTheme>): Promise<CustomTheme | undefined>;
  deleteCustomTheme(id: string): Promise<boolean>;
  
  // User Theme Settings
  getUserThemeSettings(userId: string): Promise<UserThemeSettings | undefined>;
  updateUserThemeSettings(userId: string, settings: Partial<UserThemeSettings>): Promise<UserThemeSettings>;
  
  // Video Conferences
  getVideoConference(id: string): Promise<VideoConference | undefined>;
  getVideoConferences(filters?: { hostId?: string; status?: string }): Promise<VideoConference[]>;
  createVideoConference(conference: InsertVideoConference): Promise<VideoConference>;
  updateVideoConference(id: string, updates: Partial<VideoConference>): Promise<VideoConference | undefined>;
  joinVideoConference(conferenceId: string, userId: string): Promise<boolean>;
  leaveVideoConference(conferenceId: string, userId: string): Promise<boolean>;
  
  // Payment Plans
  getPaymentPlan(id: string): Promise<PaymentPlan | undefined>;
  getPaymentPlans(filters?: { type?: string; isActive?: boolean }): Promise<PaymentPlan[]>;
  createPaymentPlan(plan: InsertPaymentPlan): Promise<PaymentPlan>;
  updatePaymentPlan(id: string, updates: Partial<PaymentPlan>): Promise<PaymentPlan | undefined>;
  
  // Payment Transactions
  getPaymentTransaction(id: string): Promise<PaymentTransaction | undefined>;
  getUserPaymentTransactions(userId: string): Promise<PaymentTransaction[]>;
  createPaymentTransaction(transaction: InsertPaymentTransaction): Promise<PaymentTransaction>;
  updatePaymentTransaction(id: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction | undefined>;
}

import { SqliteStorage } from './sqlite-storage';

// Use SQLite storage instead of memory storage
export const storage = new SqliteStorage();