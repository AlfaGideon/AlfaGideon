import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertLessonSchema,
  insertMessageSchema, 
  insertGameScoreSchema, 
  insertQuizSchema, 
  insertQuizAttemptSchema,
  insertTelegramMessageSchema,
  insertAdminLogSchema,
  insertSystemSettingSchema,
  insertTutorStudentSchema,
  insertTheoryMaterialSchema,
  insertEruditSessionSchema,
  insertEruditMoveSchema,
  insertAvatarRequestSchema,
  insertContentFilterSchema,
  insertDailyTaskSchema,
  insertFriendshipSchema,
  insertCustomThemeSchema,
  insertUserThemeSettingsSchema,
  insertVideoConferenceSchema,
  insertPaymentPlanSchema,
  insertPaymentTransactionSchema,
} from "@shared/schema";
import { generateBotResponse, isEducationalQuestion } from './openai';

// AI Bot user ID - this will be our virtual tutor
let AI_BOT_ID = 'ai-bot-virtual-tutor';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize AI Bot user if it doesn't exist
  async function initializeAIBot() {
    try {
      const existingBot = await storage.getUser(AI_BOT_ID);
      // Try to find existing AI bot by username
      const existingBotByUsername = await storage.getUserByUsername('ai_tutor_bot');
      
      if (!existingBot && !existingBotByUsername) {
        // Create AI bot user
        const botUser = {
          username: 'ai_tutor_bot',
          email: 'ai@tutor.bot',
          password: null,
          role: 'tutor',
          firstName: 'AI',
          lastName: 'Репетитор',
          avatar: null,
          level: 100,
          experience: 10000,
          streak: 365,
          lastActivity: Date.now(),
          isOnline: true,
          telegramId: null,
          telegramUsername: null,
          telegramChatId: null,
          telegramAuthDate: null,
          telegramHash: null,
          isBlocked: false,
          blockedAt: null,
          blockedBy: null,
          blockReason: null,
        };
        
        const createdBot = await storage.createUser(botUser);
        AI_BOT_ID = createdBot.id;
        console.log('✅ AI Bot user created successfully with ID:', AI_BOT_ID);
      } else if (existingBotByUsername) {
        // Use existing bot
        AI_BOT_ID = existingBotByUsername.id;
        await storage.updateUser(AI_BOT_ID, { isOnline: true, lastActivity: Date.now() });
        console.log('✅ Found existing AI Bot with ID:', AI_BOT_ID);
      } else {
        // Update bot to be online
        await storage.updateUser(AI_BOT_ID, { isOnline: true, lastActivity: Date.now() });
        console.log('✅ AI Bot user already exists and is now online');
      }
    } catch (error) {
      console.error('❌ Failed to initialize AI Bot:', error);
    }
  }

  // Initialize AI Bot
  await initializeAIBot();

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  interface AuthenticatedWebSocket extends WebSocket {
    userId?: string;
  }

  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'auth':
            // Authenticate user
            const user = await storage.getUser(message.userId);
            if (user) {
              ws.userId = user.id;
              await storage.updateUser(user.id, { isOnline: true });
              ws.send(JSON.stringify({ type: 'auth_success', user }));
            }
            break;
            
          case 'chat_message':
            if (ws.userId) {
              // Проверяем, что пользователь является участником чата
              const chat = await storage.getChat(message.chatId);
              if (!chat || (chat.studentId !== ws.userId && chat.tutorId !== ws.userId)) {
                console.error('User is not a participant of this chat:', { userId: ws.userId, chatId: message.chatId });
                ws.send(JSON.stringify({ type: 'error', message: 'You are not authorized to send messages in this chat' }));
                break;
              }
              
              const newMessage = await storage.createMessage({
                chatId: message.chatId,
                senderId: ws.userId,
                content: message.content,
                type: message.messageType || 'text',
                metadata: message.metadata,
                isRead: false,
              });
              
              // Create notification for the other participant
              try {
                if (chat) {
                  const recipientId = chat.studentId === ws.userId ? chat.tutorId : chat.studentId;
                  const sender = await storage.getUser(ws.userId);
                  
                  if (recipientId && sender) {
                    await storage.createNotification({
                      userId: recipientId,
                      type: 'message',
                      title: `Новое сообщение от ${sender.firstName} ${sender.lastName}`,
                      message: message.content.length > 50 ? `${message.content.substring(0, 50)}...` : message.content,
                      data: JSON.stringify({ chatId: message.chatId, senderId: ws.userId }),
                      createdAt: Date.now(),
                    });
                  }
                }
              } catch (error) {
                console.error('Failed to create notification:', error);
              }

              // Broadcast to all connected clients in the chat
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'new_message',
                    message: newMessage,
                  }));
                }
              });

              // Check if this chat has AI bot and generate response
              try {
                const chat = await storage.getChat(message.chatId);
                if (chat && (chat.tutorId === AI_BOT_ID || chat.studentId === AI_BOT_ID)) {
                  // Get recent chat history for context
                  const recentMessages = await storage.getMessagesByChat(message.chatId, 10);
                  const chatHistory = recentMessages
                    .filter(msg => msg.senderId !== AI_BOT_ID) // Exclude bot's own messages from history
                    .slice(-5) // Last 5 user messages for context
                    .map(msg => ({
                      role: 'user' as const,
                      content: msg.content
                    }));

                  // Check if we should respond (for educational questions or general conversation)
                  const shouldRespond = await isEducationalQuestion(message.content);
                  
                  if (shouldRespond) {
                    // Generate AI response
                    const botResponse = await generateBotResponse(message.content, chatHistory);
                    
                    // Create bot message
                    const botMessage = await storage.createMessage({
                      chatId: message.chatId,
                      senderId: AI_BOT_ID,
                      content: botResponse,
                      type: 'text',
                      metadata: null,
                      isRead: false,
                    });

                    // Broadcast bot response
                    setTimeout(() => {
                      wss.clients.forEach((client: AuthenticatedWebSocket) => {
                        if (client.readyState === WebSocket.OPEN) {
                          client.send(JSON.stringify({
                            type: 'new_message',
                            message: botMessage,
                          }));
                        }
                      });
                    }, 1000); // Small delay to make it feel more natural
                  }
                }
              } catch (error) {
                console.error('AI bot response error:', error);
              }
            }
            break;
            
          case 'typing':
            if (ws.userId) {
              // Проверяем, что пользователь является участником чата
              const chat = await storage.getChat(message.chatId);
              if (!chat || (chat.studentId !== ws.userId && chat.tutorId !== ws.userId)) {
                console.error('User is not a participant of this chat for typing:', { userId: ws.userId, chatId: message.chatId });
                break;
              }
              
              // Broadcast typing indicator
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.userId !== ws.userId) {
                  client.send(JSON.stringify({
                    type: 'user_typing',
                    userId: ws.userId,
                    chatId: message.chatId,
                  }));
                }
              });
            }
            break;
            
          // Video Call WebRTC Signaling
          case 'call_initiate':
            console.log('Received call_initiate:', { 
              userId: ws.userId, 
              callerId: message.callerId, 
              calleeId: message.calleeId,
              callType: message.callType,
              chatId: message.chatId,
              hasOffer: !!message.offer
            });
            
            if (ws.userId) {
              const chat = await storage.getChat(message.chatId);
              if (!chat || (chat.studentId !== ws.userId && chat.tutorId !== ws.userId)) {
                console.error('User is not a participant of this chat for call:', { userId: ws.userId, chatId: message.chatId });
                break;
              }
              
              // Find the recipient and send call initiation
              let recipientFound = false;
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.userId === message.calleeId) {
                  console.log('Forwarding call_incoming to recipient:', message.calleeId);
                  recipientFound = true;
                  client.send(JSON.stringify({
                    type: 'call_incoming',
                    chatId: message.chatId,
                    callerId: message.callerId,
                    calleeId: message.calleeId,
                    callType: message.callType,
                    offer: message.offer,
                  }));
                }
              });
              
              if (!recipientFound) {
                console.warn('Recipient not found or not online:', message.calleeId);
                console.log('Connected clients:', Array.from(wss.clients).map((client: AuthenticatedWebSocket) => ({
                  userId: client.userId,
                  readyState: client.readyState,
                  isOpen: client.readyState === WebSocket.OPEN
                })));
              }
              
              // Create notification for incoming call
              try {
                const caller = await storage.getUser(message.callerId);
                if (caller) {
                  await storage.createNotification({
                    userId: message.calleeId,
                    type: 'call',
                    title: `Входящий ${message.callType === 'video' ? 'видео' : 'аудио'} звонок`,
                    message: `${caller.firstName} ${caller.lastName} звонит вам`,
                    data: JSON.stringify({ 
                      chatId: message.chatId, 
                      callerId: message.callerId,
                      callType: message.callType 
                    }),
                    createdAt: Date.now(),
                  });
                }
              } catch (error) {
                console.error('Failed to create call notification:', error);
              }
            }
            break;
            
          case 'call_answer':
            if (ws.userId) {
              // Forward answer to caller
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.userId === message.callerId) {
                  client.send(JSON.stringify({
                    type: 'call_answer',
                    callerId: message.callerId,
                    calleeId: message.calleeId,
                    answer: message.answer,
                  }));
                }
              });
            }
            break;
            
          case 'call_ice_candidate':
            if (ws.userId) {
              // Forward ICE candidate to the other participant
              const recipientId = message.callerId === ws.userId ? message.calleeId : message.callerId;
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.userId === recipientId) {
                  client.send(JSON.stringify({
                    type: 'call_ice_candidate',
                    callerId: message.callerId,
                    calleeId: message.calleeId,
                    candidate: message.candidate,
                  }));
                }
              });
            }
            break;
            
          case 'call_renegotiate':
            console.log('Received call_renegotiate:', { 
              userId: ws.userId, 
              callerId: message.callerId, 
              calleeId: message.calleeId,
              hasOffer: !!message.offer
            });
            
            if (ws.userId) {
              // Forward renegotiation offer to the other participant
              const recipientId = message.callerId === ws.userId ? message.calleeId : message.callerId;
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.userId === recipientId) {
                  console.log('Forwarding call_renegotiate to recipient:', recipientId);
                  client.send(JSON.stringify({
                    type: 'call_renegotiate',
                    callerId: message.callerId,
                    calleeId: message.calleeId,
                    offer: message.offer,
                  }));
                }
              });
            }
            break;
            
          case 'call_renegotiate_answer':
            console.log('Received call_renegotiate_answer:', { 
              userId: ws.userId, 
              callerId: message.callerId, 
              calleeId: message.calleeId,
              hasAnswer: !!message.answer
            });
            
            if (ws.userId) {
              // Forward renegotiation answer to the other participant
              const recipientId = message.callerId === ws.userId ? message.calleeId : message.callerId;
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.userId === recipientId) {
                  console.log('Forwarding call_renegotiate_answer to recipient:', recipientId);
                  client.send(JSON.stringify({
                    type: 'call_renegotiate_answer',
                    callerId: message.callerId,
                    calleeId: message.calleeId,
                    answer: message.answer,
                  }));
                }
              });
            }
            break;
            
          case 'call_reject':
            if (ws.userId) {
              // Forward rejection to caller
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.userId === message.callerId) {
                  client.send(JSON.stringify({
                    type: 'call_reject',
                    callerId: message.callerId,
                    calleeId: message.calleeId,
                  }));
                }
              });
            }
            break;
            
          case 'call_end':
            if (ws.userId) {
              // Forward call end to the other participant
              const recipientId = message.callerId === ws.userId ? message.calleeId : message.callerId;
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.userId === recipientId) {
                  client.send(JSON.stringify({
                    type: 'call_end',
                    callerId: message.callerId,
                    calleeId: message.calleeId,
                  }));
                }
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (ws.userId) {
        await storage.updateUser(ws.userId, { isOnline: false });
      }
      console.log('WebSocket connection closed');
    });
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (user && user.password === password) {
        await storage.updateUser(user.id, { lastActivity: Date.now(), isOnline: true });
        res.json({ user: { ...user, password: undefined } });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log('Registration attempt with data:', req.body);
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Пользователь с таким именем уже существует" });
      }
      
      const user = await storage.createUser(userData);
      console.log('User created successfully:', user.id);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: "Ошибка регистрации: " + (error instanceof Error ? error.message : 'Неизвестная ошибка') });
    }
  });

  // Test route to check users
  app.post("/api/test", async (req, res) => {
    try {
      console.log('Testing demo_student lookup...');
      const demoStudent = await storage.getUserByUsername('demo_student');
      console.log('Demo student result:', demoStudent);
      
      const allStudents = await storage.getUsersByRole('student');
      console.log('All students count:', allStudents.length);
      
      res.json({ 
        success: true,
        demoStudent: demoStudent ? { id: demoStudent.id, username: demoStudent.username } : null,
        studentsCount: allStudents.length,
        students: allStudents.map(u => ({ id: u.id, username: u.username, role: u.role }))
      });
    } catch (error) {
      console.error('Test error:', error);
      res.status(500).json({ message: "Test error", error: (error as Error).message });
    }
  });

  // Endpoint for searching tutors by subjects
  app.post("/api/tutors/search", async (req, res) => {
    try {
      const { subjects } = req.body;
      
      if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ message: "Необходимо указать предметы для поиска" });
      }
      
      const tutors = await storage.getUsersBySubjects(subjects);
      const tutorsWithoutPasswords = tutors.map(tutor => ({
        ...tutor,
        password: undefined
      }));
      
      res.json({ tutors: tutorsWithoutPasswords });
    } catch (error) {
      console.error('Tutor search error:', error);
      res.status(500).json({ message: "Ошибка поиска преподавателей" });
    }
  });

  // Demo login endpoints for easy access
  app.post("/api/auth/demo-login", async (req, res) => {
    try {
      console.log('Demo login attempt for role:', req.body.role);
      const { role } = req.body;
      
      let demoUser;
      if (role === 'student') {
        console.log('Looking for demo_student...');
        demoUser = await storage.getUserByUsername('demo_student');
        console.log('Found demo_student:', demoUser ? 'YES' : 'NO');
      } else if (role === 'tutor' || role === 'teacher') {
        console.log('Looking for demo_teacher...');
        demoUser = await storage.getUserByUsername('demo_teacher');
        console.log('Found demo_teacher:', demoUser ? 'YES' : 'NO');
      } else if (role === 'parent') {
        console.log('Looking for demo_parent...');
        demoUser = await storage.getUserByUsername('demo_parent');
        console.log('Found demo_parent:', demoUser ? 'YES' : 'NO');
      } else {
        return res.status(400).json({ message: "Недопустимая роль. Используйте 'student', 'teacher' или 'parent'." });
      }
      
      if (demoUser) {
        console.log('Updating user activity...');
        await storage.updateUser(demoUser.id, { lastActivity: Date.now(), isOnline: true });
        console.log('Demo login successful for:', demoUser.username);
        res.json({ user: { ...demoUser, password: undefined } });
      } else {
        res.status(404).json({ message: "Демо-аккаунт не найден" });
      }
    } catch (error) {
      console.error('Demo login error:', error);
      res.status(500).json({ message: "Ошибка входа в демо-аккаунт" });
    }
  });

  app.get("/api/auth/demo-accounts", async (req, res) => {
    try {
      const demoAccounts = [
        {
          role: 'student',
          username: 'demo_student',
          password: 'password',
          name: 'Демо Студент',
          description: 'Для ознакомления с функциями ученика'
        },
        {
          role: 'teacher',
          username: 'demo_teacher', 
          password: 'password',
          name: 'Демо Преподаватель',
          description: 'Для ознакомления с функциями преподавателя'
        },
        {
          role: 'parent',
          username: 'demo_parent',
          password: 'password', 
          name: 'Демо Родитель',
          description: 'Для ознакомления с функциями родителя'
        }
      ];
      res.json(demoAccounts);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения демо-аккаунтов" });
    }
  });

  // User routes
  app.get("/api/users/profile/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (user) {
        res.json({ ...user, password: undefined });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/api/users/profile/:id", async (req, res) => {
    try {
      const updates = req.body;
      delete updates.password; // Don't allow password updates through this endpoint
      
      const user = await storage.updateUser(req.params.id, updates);
      if (user) {
        res.json({ ...user, password: undefined });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get("/api/users/count", async (req, res) => {
    try {
      const count = await storage.getUsersCount();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to get users count" });
    }
  });

  // Get users by role or search by name/username
  app.get("/api/users", async (req, res) => {
    try {
      const { role, search } = req.query;
      
      // If search query is provided, search users by name/username
      if (search && typeof search === 'string') {
        const users = await storage.searchUsers(search);
        const safeUsers = users.map(user => ({ ...user, password: undefined }));
        return res.json(safeUsers);
      }
      
      // Otherwise get users by role
      if (!role || typeof role !== 'string') {
        return res.status(400).json({ message: "Role parameter is required when not searching" });
      }
      
      if (!['student', 'tutor', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be student, tutor, or admin" });
      }
      
      const users = await storage.getUsersByRole(role as 'student' | 'tutor' | 'admin');
      
      // Remove passwords from response
      const safeUsers = users.map(user => ({ ...user, password: undefined }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error('Failed to get users:', error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Game routes
  app.get("/api/games", async (req, res) => {
    try {
      const { type } = req.query;
      const games = await storage.getGames(type as string);
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Failed to get games" });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (game) {
        res.json(game);
      } else {
        res.status(404).json({ message: "Game not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get game" });
    }
  });

  app.post("/api/game-scores", async (req, res) => {
    try {
      const scoreData = insertGameScoreSchema.parse(req.body);
      const score = await storage.createGameScore(scoreData);
      res.json(score);
    } catch (error) {
      res.status(400).json({ message: "Failed to save game score" });
    }
  });

  app.get("/api/game-scores/user/:userId", async (req, res) => {
    try {
      const scores = await storage.getGameScoresByUser(req.params.userId);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user scores" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const { gameId, limit } = req.query;
      const leaderboard = await storage.getLeaderboard(
        gameId as string,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  // Lesson routes
  app.get("/api/lessons", async (req, res) => {
    try {
      const { difficulty, category, authorId } = req.query;
      const lessons = await storage.getLessons({
        difficulty: difficulty as string,
        category: category as string,
        authorId: authorId as string,
      });
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ message: "Failed to get lessons" });
    }
  });

  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const lesson = await storage.getLesson(req.params.id);
      if (lesson) {
        res.json(lesson);
      } else {
        res.status(404).json({ message: "Lesson not found" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get lesson" });
    }
  });

  // Progress routes
  app.get("/api/progress/user/:userId", async (req, res) => {
    try {
      const progress = await storage.getUserProgressByUser(req.params.userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user progress" });
    }
  });

  app.get("/api/progress/all-students", async (req, res) => {
    try {
      const students = await storage.getUsersByRole('student');
      const allProgress = [];
      for (const student of students) {
        const progress = await storage.getUserProgressByUser(student.id);
        allProgress.push(...progress.map(p => ({ ...p, student })));
      }
      res.json(allProgress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get all students progress" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    try {
      const progressData = req.body;
      const progress = await storage.createUserProgress(progressData);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: "Failed to save progress" });
    }
  });

  // Chat routes
  app.get("/api/chats/user/:userId", async (req, res) => {
    try {
      const chats = await storage.getChatsByUser(req.params.userId);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chats" });
    }
  });

  app.get("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const { limit } = req.query;
      const messages = await storage.getMessagesByChat(
        req.params.chatId,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Voice message upload endpoint
  app.post("/api/messages/voice", async (req, res) => {
    try {
      const { chatId, duration, messageType } = req.body;
      
      if (!chatId || !duration) {
        return res.status(400).json({ message: "Chat ID and duration are required" });
      }

      // For now, create a placeholder audio URL
      // In a real implementation, you would save the audio file to object storage
      const audioUrl = `/api/audio/${Date.now()}_voice.webm`;
      
      // Create the message in storage
      const messageData = {
        chatId,
        senderId: req.body.senderId || 'user',
        content: audioUrl,
        type: 'audio' as const,
        audioUrl,
        audioDuration: parseInt(duration),
        audioTranscript: null,
        metadata: JSON.stringify({
          audioDuration: parseInt(duration),
          audioUrl,
        }),
        isRead: false,
      };

      // In a real app, you would save the audio file here
      // const audioFile = req.files?.audio;
      // const savedPath = await saveAudioFile(audioFile);
      
      res.json({ 
        audioUrl,
        duration: parseInt(duration),
        message: "Voice message uploaded successfully" 
      });
    } catch (error) {
      console.error('Voice message upload error:', error);
      res.status(500).json({ message: "Failed to upload voice message" });
    }
  });

  app.post("/api/chats", async (req, res) => {
    try {
      const chatData = req.body;
      const chat = await storage.createChat(chatData);
      res.json(chat);
    } catch (error) {
      res.status(400).json({ message: "Failed to create chat" });
    }
  });

  // Create chat with AI Bot
  app.post("/api/chats/ai-bot", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Check if chat with AI bot already exists
      const existingChats = await storage.getChatsByUser(userId);
      const existingAIChat = existingChats.find((chat: any) => 
        chat.tutorId === AI_BOT_ID || chat.studentId === AI_BOT_ID
      );

      if (existingAIChat) {
        return res.json(existingAIChat);
      }

      // Create new chat with AI bot
      const chatData = {
        studentId: userId,
        tutorId: AI_BOT_ID,
        createdAt: Date.now(),
        lastMessage: null,
        isActive: true,
      };

      const chat = await storage.createChat(chatData);
      
      // Send welcome message from AI bot
      await storage.createMessage({
        chatId: chat.id,
        senderId: AI_BOT_ID,
        content: '👋 Привет! Я ваш AI репетитор русского языка. Задавайте любые вопросы о грамматике, лексике, литературе - я помогу вам учиться! Что вас интересует?',
        type: 'text',
        metadata: null,
        isRead: false,
      });

      res.json(chat);
    } catch (error) {
      console.error('Failed to create AI bot chat:', error);
      res.status(500).json({ message: "Failed to create chat with AI bot" });
    }
  });

  // Test notifications endpoint
  app.post("/api/test/notifications/:userId", async (req, res) => {
    try {
      const { testNotifications } = await import('./notification-scheduler');
      await testNotifications(req.params.userId);
      res.json({ success: true, message: "Тестовое уведомление отправлено" });
    } catch (error) {
      console.error('Ошибка тестирования уведомлений:', error);
      res.status(500).json({ message: "Ошибка отправки тестового уведомления" });
    }
  });

  // OpenAI Key validation endpoint
  app.post("/api/admin/validate-openai-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }

      const { checkOpenAIKey, isKeyFormatValid } = await import('./openai-key-checker');
      
      if (!isKeyFormatValid(apiKey)) {
        return res.json({ 
          isValid: false, 
          error: "Неверный формат API ключа. Ключ должен начинаться с 'sk-'" 
        });
      }

      const keyInfo = await checkOpenAIKey(apiKey);
      res.json(keyInfo);
    } catch (error) {
      console.error('Failed to validate OpenAI key:', error);
      res.status(500).json({ message: "Failed to validate API key" });
    }
  });

  // Achievement routes
  app.get("/api/achievements", async (req, res) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to get achievements" });
    }
  });

  app.get("/api/achievements/user/:userId", async (req, res) => {
    try {
      const userAchievements = await storage.getUserAchievements(req.params.userId);
      res.json(userAchievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user achievements" });
    }
  });

  // Quiz routes
  app.get("/api/quizzes", async (req, res) => {
    try {
      const { difficulty, category, authorId } = req.query;
      const quizzes = await storage.getQuizzes({
        difficulty: difficulty as string,
        category: category as string,
        authorId: authorId as string,
      });
      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get quizzes" });
    }
  });

  app.post("/api/quizzes", async (req, res) => {
    try {
      const quizData = insertQuizSchema.parse(req.body);
      const quiz = await storage.createQuiz(quizData);
      res.json(quiz);
    } catch (error) {
      res.status(400).json({ message: "Failed to create quiz" });
    }
  });

  app.post("/api/quiz-attempts", async (req, res) => {
    try {
      const attemptData = insertQuizAttemptSchema.parse(req.body);
      const attempt = await storage.createQuizAttempt(attemptData);
      res.json(attempt);
    } catch (error) {
      res.status(400).json({ message: "Failed to save quiz attempt" });
    }
  });

  app.get("/api/quiz-attempts/user/:userId", async (req, res) => {
    try {
      const attempts = await storage.getQuizAttemptsByUser(req.params.userId);
      res.json(attempts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get quiz attempts" });
    }
  });

  // Telegram Integration routes
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const { telegramId, username, firstName, lastName, authDate, hash, role } = req.body;
      
      // Check if user exists with this Telegram ID
      let user = await storage.getUserByTelegramId(telegramId.toString());
      
      if (user) {
        // Update Telegram data and role if provided
        user = await storage.updateUserTelegramData(user.id, {
          telegramUsername: username,
          telegramAuthDate: authDate * 1000,
          telegramHash: hash,
          ...(role && { role })
        });
        res.json({ user, isNew: false });
      } else {
        // Create new user with specified role or default to 'student'
        const newUser = await storage.createUser({
          username: username || `user_${telegramId}`,
          firstName,
          lastName,
          telegramId: telegramId.toString(),
          telegramUsername: username,
          telegramAuthDate: authDate * 1000,
          telegramHash: hash,
          role: role || 'student',
        });
        res.json({ user: newUser, isNew: true });
      }
    } catch (error) {
      console.error('Telegram auth error:', error);
      res.status(400).json({ message: "Failed to authenticate via Telegram" });
    }
  });

  app.post("/api/telegram/messages", async (req, res) => {
    try {
      const messageData = insertTelegramMessageSchema.parse(req.body);
      const message = await storage.createTelegramMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to sync Telegram message" });
    }
  });

  app.get("/api/telegram/messages/:telegramChatId", async (req, res) => {
    try {
      const messages = await storage.getTelegramMessagesByChat(req.params.telegramChatId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get Telegram messages" });
    }
  });

  // Admin routes
  app.post("/api/admin/verify-password", async (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = await storage.getSystemSetting("admin_password");
      
      if (adminPassword && adminPassword.value === password) {
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: "Invalid password" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to verify password" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const { role, blocked } = req.query;
      let users = await storage.getUsersByRole(role as string || '');
      
      if (blocked === 'true') {
        users = users.filter(user => user.isBlocked);
      } else if (blocked === 'false') {
        users = users.filter(user => !user.isBlocked);
      }
      
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.post("/api/admin/users/:userId/block", async (req, res) => {
    try {
      const { userId } = req.params;
      const { adminId, reason } = req.body;
      
      const success = await storage.blockUser(userId, adminId, reason);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  app.post("/api/admin/users/:userId/unblock", async (req, res) => {
    try {
      const { userId } = req.params;
      const { adminId } = req.body;
      
      const success = await storage.unblockUser(userId, adminId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to unblock user" });
    }
  });

  app.get("/api/admin/logs", async (req, res) => {
    try {
      const { adminId, limit } = req.query;
      const logs = await storage.getAdminLogs(
        adminId as string,
        limit ? parseInt(limit as string) : 50
      );
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get admin logs" });
    }
  });

  app.post("/api/admin/logs", async (req, res) => {
    try {
      const logData = insertAdminLogSchema.parse(req.body);
      const log = await storage.createAdminLog(logData);
      res.json(log);
    } catch (error) {
      res.status(400).json({ message: "Failed to create admin log" });
    }
  });

  app.post("/api/admin/backup", async (req, res) => {
    try {
      const { adminId } = req.body;
      
      // Create backup log entry
      const logData = {
        adminId: adminId || 'admin-1',
        action: 'create_backup',
        targetType: 'system',
        targetId: 'backup-' + Date.now(),
        details: `Резервная копия создана ${new Date().toLocaleString('ru-RU')}`
      };
      
      await storage.createAdminLog(logData);
      
      // In a real implementation, this would create actual backup files
      // For now, we just return success
      res.json({ 
        success: true, 
        message: "Резервная копия успешно создана",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  // Avatar requests routes
  app.get("/api/admin/avatar-requests", async (req, res) => {
    try {
      const requests = await storage.getAvatarRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get avatar requests" });
    }
  });

  app.post("/api/admin/avatar-requests/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { adminId } = req.body;
      
      const success = await storage.approveAvatarRequest(id, adminId);
      
      if (success) {
        await storage.createAdminLog({
          adminId: adminId || 'admin-1',
          action: 'approve_avatar',
          targetType: 'avatar_request',
          targetId: id,
          details: 'Запрос на смену аватара одобрен'
        });
        
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Avatar request not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to approve avatar request" });
    }
  });

  app.post("/api/admin/avatar-requests/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { adminId, reason } = req.body;
      
      const success = await storage.rejectAvatarRequest(id, adminId, reason);
      
      if (success) {
        await storage.createAdminLog({
          adminId: adminId || 'admin-1',
          action: 'reject_avatar',
          targetType: 'avatar_request',
          targetId: id,
          details: `Запрос на смену аватара отклонен: ${reason}`
        });
        
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Avatar request not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to reject avatar request" });
    }
  });

  // Notifications routes
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Failed to get notifications:', error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.markNotificationAsRead(id);
      if (success) {
        res.json({ success: true, message: "Notification marked as read" });
      } else {
        res.status(404).json({ message: "Notification not found" });
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteNotification(id);
      if (success) {
        res.json({ success: true, message: "Notification deleted" });
      } else {
        res.status(404).json({ message: "Notification not found" });
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // System Settings routes
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const { category } = req.query;
      const settings = await storage.getSystemSettings(category as string);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    try {
      console.log('Received setting data:', req.body);
      const settingData = insertSystemSettingSchema.parse(req.body);
      console.log('Parsed setting data:', settingData);
      
      // Проверяем существование пользователя updatedBy
      if (settingData.updatedBy) {
        const user = await storage.getUser(settingData.updatedBy);
        if (!user) {
          console.warn(`User ${settingData.updatedBy} not found, setting updatedBy to null`);
          settingData.updatedBy = null;
        }
      }
      
      const setting = await storage.setSystemSetting(settingData);
      console.log('Setting saved successfully:', setting);
      res.json(setting);
    } catch (error) {
      console.error('Failed to save setting:', error);
      res.status(400).json({ 
        message: "Failed to save setting", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/admin/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const { value, updatedBy } = req.body;
      
      const setting = await storage.updateSystemSetting(key, value, updatedBy);
      if (setting) {
        res.json(setting);
      } else {
        res.status(404).json({ message: "Setting not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Database Management Routes for Admin Panel
  // Users table management
  app.get("/api/admin/db/users", async (req, res) => {
    try {
      // Get all users by getting students, tutors, and admins
      const students = await storage.getUsersByRole('student');
      const tutors = await storage.getUsersByRole('tutor');
      const admins = await storage.getUsersByRole('admin');
      const users = [...students, ...tutors, ...admins];
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.post("/api/admin/db/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/admin/db/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/db/users/:id", async (req, res) => {
    try {
      const success = await storage.deleteUser(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Lessons table management
  app.get("/api/admin/db/lessons", async (req, res) => {
    try {
      const lessons = await storage.getLessons();
      res.json(lessons);
    } catch (error) {
      res.status(500).json({ message: "Failed to get lessons" });
    }
  });

  app.post("/api/admin/db/lessons", async (req, res) => {
    try {
      // Validate lesson data
      const lessonData = insertLessonSchema.parse(req.body);
      const lesson = await storage.createLesson(lessonData);
      res.json(lesson);
    } catch (error) {
      console.error('Lesson creation error:', error);
      res.status(400).json({ message: "Failed to create lesson" });
    }
  });

  app.put("/api/admin/db/lessons/:id", async (req, res) => {
    try {
      const lesson = await storage.updateLesson(req.params.id, req.body);
      res.json(lesson);
    } catch (error) {
      res.status(400).json({ message: "Failed to update lesson" });
    }
  });

  app.delete("/api/admin/db/lessons/:id", async (req, res) => {
    try {
      const success = await storage.deleteLesson(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  // Progress table management
  app.get("/api/admin/db/progress", async (req, res) => {
    try {
      const allProgress = await storage.getAllProgress();
      res.json(allProgress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get progress" });
    }
  });

  app.post("/api/admin/db/progress", async (req, res) => {
    try {
      // Simplified progress creation
      const progress = await storage.createUserProgress(req.body);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: "Failed to create progress" });
    }
  });

  app.put("/api/admin/db/progress/:id", async (req, res) => {
    try {
      const progress = await storage.updateUserProgress(req.params.id, req.body);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: "Failed to update progress" });
    }
  });

  app.delete("/api/admin/db/progress/:id", async (req, res) => {
    try {
      // Mark progress as incomplete instead of deleting
      await storage.updateUserProgress(req.params.id, { completed: false });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete progress" });
    }
  });

  // Game scores table management
  app.get("/api/admin/db/game-scores", async (req, res) => {
    try {
      const scores = await storage.getAllGameScores();
      res.json(scores);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game scores" });
    }
  });

  app.post("/api/admin/db/game-scores", async (req, res) => {
    try {
      const scoreData = insertGameScoreSchema.parse(req.body);
      const score = await storage.createGameScore(scoreData);
      res.json(score);
    } catch (error) {
      res.status(400).json({ message: "Failed to create game score" });
    }
  });

  app.put("/api/admin/db/game-scores/:id", async (req, res) => {
    try {
      const score = await storage.updateGameScore(req.params.id, req.body);
      res.json(score);
    } catch (error) {
      res.status(400).json({ message: "Failed to update game score" });
    }
  });

  app.delete("/api/admin/db/game-scores/:id", async (req, res) => {
    try {
      const success = await storage.deleteGameScore(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete game score" });
    }
  });

  // Achievements table management
  app.get("/api/admin/db/achievements", async (req, res) => {
    try {
      const achievements = await storage.getAchievements();
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to get achievements" });
    }
  });

  app.post("/api/admin/db/achievements", async (req, res) => {
    try {
      const achievement = await storage.createAchievement(req.body);
      res.json(achievement);
    } catch (error) {
      res.status(400).json({ message: "Failed to create achievement" });
    }
  });

  app.put("/api/admin/db/achievements/:id", async (req, res) => {
    try {
      const achievement = await storage.updateAchievement(req.params.id, req.body);
      res.json(achievement);
    } catch (error) {
      res.status(400).json({ message: "Failed to update achievement" });
    }
  });

  app.delete("/api/admin/db/achievements/:id", async (req, res) => {
    try {
      const success = await storage.deleteAchievement(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete achievement" });
    }
  });

  // Quiz attempts table management
  app.get("/api/admin/db/quiz-attempts", async (req, res) => {
    try {
      const attempts = await storage.getAllQuizAttempts();
      res.json(attempts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get quiz attempts" });
    }
  });

  app.post("/api/admin/db/quiz-attempts", async (req, res) => {
    try {
      const attemptData = insertQuizAttemptSchema.parse(req.body);
      const attempt = await storage.createQuizAttempt(attemptData);
      res.json(attempt);
    } catch (error) {
      res.status(400).json({ message: "Failed to create quiz attempt" });
    }
  });

  app.put("/api/admin/db/quiz-attempts/:id", async (req, res) => {
    try {
      const attempt = await storage.updateQuizAttempt(req.params.id, req.body);
      res.json(attempt);
    } catch (error) {
      res.status(400).json({ message: "Failed to update quiz attempt" });
    }
  });

  app.delete("/api/admin/db/quiz-attempts/:id", async (req, res) => {
    try {
      const success = await storage.deleteQuizAttempt(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete quiz attempt" });
    }
  });

  // Chat messages table management
  app.get("/api/admin/db/chat-messages", async (req, res) => {
    try {
      const messages = await storage.getAllChatMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get chat messages" });
    }
  });

  app.post("/api/admin/db/chat-messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to create chat message" });
    }
  });

  app.put("/api/admin/db/chat-messages/:id", async (req, res) => {
    try {
      const message = await storage.updateChatMessage(req.params.id, req.body);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to update chat message" });
    }
  });

  app.delete("/api/admin/db/chat-messages/:id", async (req, res) => {
    try {
      const success = await storage.deleteChatMessage(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete chat message" });
    }
  });

  // Telegram messages table management
  app.get("/api/admin/db/telegram-messages", async (req, res) => {
    try {
      const messages = await storage.getAllTelegramMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get telegram messages" });
    }
  });

  app.post("/api/admin/db/telegram-messages", async (req, res) => {
    try {
      const messageData = insertTelegramMessageSchema.parse(req.body);
      const message = await storage.createTelegramMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to create telegram message" });
    }
  });

  app.put("/api/admin/db/telegram-messages/:id", async (req, res) => {
    try {
      const message = await storage.updateTelegramMessage(req.params.id, req.body);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to update telegram message" });
    }
  });

  app.delete("/api/admin/db/telegram-messages/:id", async (req, res) => {
    try {
      const success = await storage.deleteTelegramMessage(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete telegram message" });
    }
  });

  // Admin logs table management
  app.get("/api/admin/db/admin-logs", async (req, res) => {
    try {
      const logs = await storage.getAdminLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get admin logs" });
    }
  });

  app.post("/api/admin/db/admin-logs", async (req, res) => {
    try {
      const logData = insertAdminLogSchema.parse(req.body);
      const log = await storage.createAdminLog(logData);
      res.json(log);
    } catch (error) {
      res.status(400).json({ message: "Failed to create admin log" });
    }
  });

  app.put("/api/admin/db/admin-logs/:id", async (req, res) => {
    try {
      const log = await storage.updateAdminLog(req.params.id, req.body);
      res.json(log);
    } catch (error) {
      res.status(400).json({ message: "Failed to update admin log" });
    }
  });

  app.delete("/api/admin/db/admin-logs/:id", async (req, res) => {
    try {
      const success = await storage.deleteAdminLog(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete admin log" });
    }
  });

  // System settings table management
  app.get("/api/admin/db/system-settings", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get system settings" });
    }
  });

  app.post("/api/admin/db/system-settings", async (req, res) => {
    try {
      const settingData = insertSystemSettingSchema.parse(req.body);
      const setting = await storage.setSystemSetting(settingData);
      res.json(setting);
    } catch (error) {
      res.status(400).json({ message: "Failed to create system setting" });
    }
  });

  app.put("/api/admin/db/system-settings/:id", async (req, res) => {
    try {
      const setting = await storage.updateSystemSettingById(req.params.id, req.body);
      res.json(setting);
    } catch (error) {
      res.status(400).json({ message: "Failed to update system setting" });
    }
  });

  app.delete("/api/admin/db/system-settings/:id", async (req, res) => {
    try {
      const success = await storage.deleteSystemSetting(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete system setting" });
    }
  });

  // Tutor-Student Management routes
  app.get("/api/tutors/:tutorId/students", async (req, res) => {
    try {
      console.log("Getting tutor students for:", req.params.tutorId);
      const assignments = await storage.getTutorStudents(req.params.tutorId);
      console.log("Found assignments:", assignments);
      res.json(assignments);
    } catch (error) {
      console.error("Error getting tutor students:", error);
      res.status(500).json({ message: "Failed to get tutor students" });
    }
  });

  app.get("/api/students/:studentId/tutors", async (req, res) => {
    try {
      const assignments = await storage.getStudentTutors(req.params.studentId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get student tutors" });
    }
  });

  app.post("/api/tutor-assignments", async (req, res) => {
    try {
      console.log("Received assignment request:", req.body);
      const assignmentData = insertTutorStudentSchema.parse(req.body);
      console.log("Parsed assignment data:", assignmentData);
      const assignment = await storage.assignTutorToStudent(assignmentData);
      console.log("Assignment created:", assignment);
      res.json(assignment);
    } catch (error) {
      console.error("Assignment error:", error);
      res.status(400).json({ message: "Failed to assign tutor to student", error: String(error) });
    }
  });

  app.delete("/api/tutor-assignments/:tutorId/:studentId", async (req, res) => {
    try {
      const { tutorId, studentId } = req.params;
      const success = await storage.unassignTutorFromStudent(tutorId, studentId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to unassign tutor from student" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", async (req, res) => {
    try {
      const { fileName, fileData, contentType } = req.body;
      
      if (!fileName || !fileData) {
        return res.status(400).json({ message: "Missing file data" });
      }

      const uniqueFileName = `${Date.now()}_${fileName}`;
      
      // Сохраняем файл на диск
      const fs = await import('fs/promises');
      const path = await import('path');
      
      try {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
        await fs.mkdir(uploadsDir, { recursive: true });
        
        // Конвертируем base64 обратно в буфер и сохраняем на диск
        const base64Data = fileData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(uploadsDir, uniqueFileName);
        
        await fs.writeFile(filePath, buffer);
        console.log(`File saved to disk: ${filePath}`);
      } catch (diskError) {
        console.error('Failed to save file to disk:', diskError);
        // Продолжаем работу даже если не удалось сохранить на диск
      }
      
      // Store file info in memory
      if (!global.uploadedFiles) {
        global.uploadedFiles = new Map();
      }
      
      global.uploadedFiles.set(uniqueFileName, {
        data: fileData,
        contentType: contentType || 'application/octet-stream',
        originalName: fileName
      });
      
      // Return the file URL
      const fileUrl = `/api/files/${uniqueFileName}`;
      res.json({ 
        fileUrl, 
        fileName: uniqueFileName,
        originalName: fileName 
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Schedule System routes
  app.get("/api/schedule/student/:studentId", async (req, res) => {
    try {
      const { scheduleSystem } = await import('./schedule-system');
      const events = await scheduleSystem.getEventsByStudent(req.params.studentId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to get student schedule" });
    }
  });

  app.get("/api/schedule/tutor/:tutorId", async (req, res) => {
    try {
      const { scheduleSystem } = await import('./schedule-system');
      const events = await scheduleSystem.getEventsByTutor(req.params.tutorId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tutor schedule" });
    }
  });

  app.get("/api/group-classes", async (req, res) => {
    try {
      const { scheduleSystem } = await import('./schedule-system');
      const classes = await scheduleSystem.getGroupClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group classes" });
    }
  });

  app.post("/api/schedule", async (req, res) => {
    try {
      const { scheduleSystem } = await import('./schedule-system');
      const event = await scheduleSystem.createEvent(req.body);
      res.json(event);
    } catch (error) {
      res.status(400).json({ message: "Failed to create schedule event" });
    }
  });

  app.post("/api/group-classes", async (req, res) => {
    try {
      const { scheduleSystem } = await import('./schedule-system');
      const groupClass = await scheduleSystem.createGroupClass(req.body);
      res.json(groupClass);
    } catch (error) {
      res.status(400).json({ message: "Failed to create group class" });
    }
  });

  // Assignment System routes
  app.get("/api/assignments/student/:studentId", async (req, res) => {
    try {
      const { assignmentSystem } = await import('./assignment-system');
      const assignments = await assignmentSystem.getAssignmentsByStudent(req.params.studentId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get student assignments" });
    }
  });

  app.get("/api/assignments/tutor/:tutorId", async (req, res) => {
    try {
      const { assignmentSystem } = await import('./assignment-system');
      const assignments = await assignmentSystem.getAssignmentsByTutor(req.params.tutorId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tutor assignments" });
    }
  });

  app.post("/api/assignments", async (req, res) => {
    try {
      const { assignmentSystem } = await import('./assignment-system');
      const assignment = await assignmentSystem.createAssignment(req.body);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Failed to create assignment" });
    }
  });

  app.put("/api/assignments/:id", async (req, res) => {
    try {
      const { assignmentSystem } = await import('./assignment-system');
      const assignment = await assignmentSystem.updateAssignment(req.params.id, req.body);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Failed to update assignment" });
    }
  });

  app.post("/api/assignments/:id/submit", async (req, res) => {
    try {
      const { assignmentSystem } = await import('./assignment-system');
      const { submissionFiles } = req.body;
      const success = await assignmentSystem.submitAssignment(req.params.id, submissionFiles);
      res.json({ success });
    } catch (error) {
      res.status(400).json({ message: "Failed to submit assignment" });
    }
  });

  app.post("/api/assignments/:id/grade", async (req, res) => {
    try {
      const { assignmentSystem } = await import('./assignment-system');
      const { score, feedback } = req.body;
      const success = await assignmentSystem.gradeAssignment(req.params.id, score, feedback);
      res.json({ success });
    } catch (error) {
      res.status(400).json({ message: "Failed to grade assignment" });
    }
  });

  // File download endpoint
  app.get("/api/files/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      
      // Сначала проверяем память
      let fileInfo = global.uploadedFiles?.get(fileName);
      let buffer: Buffer;
      
      if (fileInfo) {
        // Файл найден в памяти
        buffer = Buffer.from(fileInfo.data.split(',')[1], 'base64');
      } else {
        // Если файла нет в памяти, пробуем загрузить с диска
        const fs = await import('fs/promises');
        const path = await import('path');
        
        try {
          const filePath = path.join(process.cwd(), 'uploads', 'avatars', fileName);
          buffer = await fs.readFile(filePath);
          
          // Добавляем файл в память для следующих запросов
          const base64Data = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
          if (!global.uploadedFiles) {
            global.uploadedFiles = new Map();
          }
          global.uploadedFiles.set(fileName, {
            data: base64Data,
            contentType: 'application/octet-stream',
            originalName: fileName
          });
          
          fileInfo = global.uploadedFiles.get(fileName);
          console.log(`File loaded from disk: ${fileName}`);
        } catch (diskError) {
          console.error(`File not found on disk: ${fileName}`, diskError);
          return res.status(404).json({ message: "File not found" });
        }
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', fileInfo?.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo?.originalName || fileName}"`);
      
      res.send(buffer);
    } catch (error: any) {
      console.error('File download error:', error);
      res.status(404).json({ message: "File not found" });
    }
  });

  // Theory Materials routes
  app.get("/api/theory-materials", async (req, res) => {
    try {
      const { authorId } = req.query;
      const materials = await storage.getTheoryMaterials({
        authorId: authorId as string,
      });
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: "Failed to get theory materials" });
    }
  });

  app.get("/api/theory-materials/:id", async (req, res) => {
    try {
      const material = await storage.getTheoryMaterial(req.params.id);
      if (material) {
        // Increment view count
        await storage.incrementTheoryMaterialView(req.params.id);
        res.json(material);
      } else {
        res.status(404).json({ message: "Theory material not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get theory material" });
    }
  });

  app.post("/api/theory-materials", async (req, res) => {
    try {
      console.log('Creating theory material with data:', req.body);
      const materialData = insertTheoryMaterialSchema.parse(req.body);
      console.log('Parsed material data:', materialData);
      const material = await storage.createTheoryMaterial(materialData);
      console.log('Material created successfully:', material);
      res.json(material);
    } catch (error) {
      console.error('Failed to create theory material:', error);
      res.status(400).json({ message: "Failed to create theory material", error: (error as Error).message });
    }
  });

  app.put("/api/theory-materials/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const material = await storage.updateTheoryMaterial(id, updates);
      if (material) {
        res.json(material);
      } else {
        res.status(404).json({ message: "Theory material not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update theory material" });
    }
  });

  app.delete("/api/theory-materials/:id", async (req, res) => {
    try {
      const success = await storage.deleteTheoryMaterial(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete theory material" });
    }
  });

  app.post("/api/theory-materials/:id/download", async (req, res) => {
    try {
      const success = await storage.incrementTheoryMaterialDownload(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to track download" });
    }
  });

  // Эрудит Game routes
  app.get("/api/erudit/sessions", async (req, res) => {
    try {
      const { hostId, status } = req.query;
      const sessions = await storage.getEruditSessions({
        hostId: hostId as string,
        status: status as string,
      });
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get Эрудит sessions" });
    }
  });

  app.get("/api/erudit/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getEruditSession(req.params.id);
      if (session) {
        res.json(session);
      } else {
        res.status(404).json({ message: "Эрудит session not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get Эрудит session" });
    }
  });

  app.post("/api/erudit/sessions", async (req, res) => {
    try {
      const sessionData = insertEruditSessionSchema.parse(req.body);
      const session = await storage.createEruditSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Failed to create Эрудит session" });
    }
  });

  app.put("/api/erudit/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const session = await storage.updateEruditSession(id, updates);
      if (session) {
        res.json(session);
      } else {
        res.status(404).json({ message: "Эрудит session not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update Эрудит session" });
    }
  });

  app.post("/api/erudit/sessions/:id/join", async (req, res) => {
    try {
      const { id } = req.params;
      const { playerId } = req.body;
      const success = await storage.joinEruditSession(id, playerId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to join Эрудит session" });
    }
  });

  app.delete("/api/erudit/sessions/:id", async (req, res) => {
    try {
      const success = await storage.deleteEruditSession(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete Эрудит session" });
    }
  });

  app.get("/api/erudit/sessions/:sessionId/moves", async (req, res) => {
    try {
      const moves = await storage.getEruditMovesBySession(req.params.sessionId);
      res.json(moves);
    } catch (error) {
      res.status(500).json({ message: "Failed to get Эрудит moves" });
    }
  });

  app.post("/api/erudit/moves", async (req, res) => {
    try {
      const moveData = insertEruditMoveSchema.parse(req.body);
      const move = await storage.createEruditMove(moveData);
      res.json(move);
    } catch (error) {
      res.status(400).json({ message: "Failed to create Эрудит move" });
    }
  });

  app.get("/api/erudit/players/:playerId/moves", async (req, res) => {
    try {
      const moves = await storage.getEruditMovesByPlayer(req.params.playerId);
      res.json(moves);
    } catch (error) {
      res.status(500).json({ message: "Failed to get player moves" });
    }
  });

  // Avatar Request endpoints
  app.post("/api/avatar/request", async (req, res) => {
    try {
      const requestData = insertAvatarRequestSchema.parse(req.body);
      const avatarRequest = await storage.createAvatarRequest(requestData);
      res.json(avatarRequest);
    } catch (error) {
      res.status(400).json({ message: "Failed to create avatar request" });
    }
  });

  app.get("/api/user/:userId/avatar-requests", async (req, res) => {
    try {
      const requests = await storage.getUserAvatarRequests(req.params.userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user avatar requests" });
    }
  });

  // Admin Avatar Management endpoints
  app.get("/api/admin/avatar-requests", async (req, res) => {
    try {
      const status = req.query.status as string;
      const requests = await storage.getAvatarRequests(status);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get avatar requests" });
    }
  });

  // Админ утилита для очистки битых аватаров
  app.post("/api/admin/fix-broken-avatars", async (req, res) => {
    try {
      console.log("Starting broken avatar cleanup...");
      
      // Получаем всех пользователей с аватарами
      const allUsers = await storage.getAllUsers();
      const usersWithAvatars = allUsers.filter(user => user.avatar && user.avatar.includes('/api/files/'));
      
      let fixedCount = 0;
      const fs = await import('fs/promises');
      const path = await import('path');
      
      for (const user of usersWithAvatars) {
        const avatarUrl = user.avatar!;
        const fileName = avatarUrl.split('/api/files/')[1];
        
        if (fileName) {
          // Проверяем существует ли файл на диске
          try {
            const filePath = path.join(process.cwd(), 'uploads', 'avatars', fileName);
            await fs.access(filePath);
            console.log(`File exists for user ${user.username}: ${fileName}`);
          } catch {
            // Файл не существует - очищаем битую ссылку
            console.log(`Clearing broken avatar for user ${user.username}: ${fileName}`);
            await storage.updateUser(user.id, { avatar: null });
            fixedCount++;
          }
        }
      }
      
      console.log(`Fixed ${fixedCount} broken avatar links`);
      res.json({ 
        message: `Cleaned up ${fixedCount} broken avatar links`,
        totalChecked: usersWithAvatars.length,
        fixed: fixedCount
      });
    } catch (error) {
      console.error('Error fixing broken avatars:', error);
      res.status(500).json({ message: "Failed to fix broken avatars" });
    }
  });

  app.put("/api/admin/avatar-requests/:id/approve", async (req, res) => {
    try {
      // Find first admin user for reviewedBy
      const adminUsers = await storage.getUsersByRole("admin");
      const adminId = adminUsers.length > 0 ? adminUsers[0].id : null;
      
      if (!adminId) {
        return res.status(500).json({ message: "No admin user found" });
      }
      
      // Update request status to approved
      const updatedRequest = await storage.updateAvatarRequest(req.params.id, {
        status: "approved",
        reviewedBy: adminId,
        reviewedAt: Date.now(),
      });

      if (!updatedRequest) {
        return res.status(404).json({ message: "Avatar request not found" });
      }

      // Update user's avatar
      await storage.updateUser(updatedRequest.userId, {
        avatar: updatedRequest.avatarUrl,
      });

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error approving avatar request:", error);
      res.status(400).json({ 
        message: "Failed to approve avatar request",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/admin/avatar-requests/:id/reject", async (req, res) => {
    try {
      const { rejectionReason } = req.body;
      
      // Find first admin user for reviewedBy
      const adminUsers = await storage.getUsersByRole("admin");
      const adminId = adminUsers.length > 0 ? adminUsers[0].id : null;
      
      if (!adminId) {
        return res.status(500).json({ message: "No admin user found" });
      }
      
      const updatedRequest = await storage.updateAvatarRequest(req.params.id, {
        status: "rejected",
        rejectionReason,
        reviewedBy: adminId,
        reviewedAt: Date.now(),
      });

      if (!updatedRequest) {
        return res.status(404).json({ message: "Avatar request not found" });
      }

      res.json(updatedRequest);
    } catch (error) {
      res.status(400).json({ message: "Failed to reject avatar request" });
    }
  });

  // Content Filter Management endpoints
  app.get("/api/admin/content-filters", async (req, res) => {
    try {
      const { type, category, isActive } = req.query;
      const filters = await storage.getContentFilters({
        type: type as string,
        category: category as string,
        isActive: isActive ? isActive === 'true' : undefined
      });
      res.json(filters);
    } catch (error) {
      res.status(500).json({ message: "Failed to get content filters" });
    }
  });

  app.get("/api/admin/content-filters/:id", async (req, res) => {
    try {
      const filter = await storage.getContentFilter(req.params.id);
      if (!filter) {
        return res.status(404).json({ message: "Content filter not found" });
      }
      res.json(filter);
    } catch (error) {
      res.status(500).json({ message: "Failed to get content filter" });
    }
  });

  app.post("/api/admin/content-filters", async (req, res) => {
    try {
      const filterData = insertContentFilterSchema.parse(req.body);
      const filter = await storage.createContentFilter(filterData);
      res.json(filter);
    } catch (error) {
      res.status(400).json({ message: "Failed to create content filter: " + (error instanceof Error ? error.message : 'Unknown error') });
    }
  });

  app.put("/api/admin/content-filters/:id", async (req, res) => {
    try {
      const updates = req.body;
      const filter = await storage.updateContentFilter(req.params.id, updates);
      if (!filter) {
        return res.status(404).json({ message: "Content filter not found" });
      }
      res.json(filter);
    } catch (error) {
      res.status(400).json({ message: "Failed to update content filter" });
    }
  });

  app.delete("/api/admin/content-filters/:id", async (req, res) => {
    try {
      const success = await storage.deleteContentFilter(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Content filter not found" });
      }
      res.json({ message: "Content filter deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete content filter" });
    }
  });

  // Daily Tasks endpoints
  app.get("/api/daily-tasks", async (req, res) => {
    try {
      const { userId, date } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const tasks = await storage.getDailyTasksByUser(userId as string, date as string);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get daily tasks" });
    }
  });

  app.post("/api/daily-tasks", async (req, res) => {
    try {
      const taskData = insertDailyTaskSchema.parse(req.body);
      const task = await storage.createDailyTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: "Failed to create daily task" });
    }
  });

  app.post("/api/daily-tasks/generate", async (req, res) => {
    try {
      const { userId, date } = req.body;
      if (!userId || !date) {
        return res.status(400).json({ message: "User ID and date are required" });
      }
      
      const tasks = await storage.generateDailyTasks(userId, date);
      res.json(tasks);
    } catch (error) {
      res.status(400).json({ message: "Failed to generate daily tasks" });
    }
  });

  app.post("/api/daily-tasks/:id/complete", async (req, res) => {
    try {
      const success = await storage.completeDailyTask(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Daily task not found" });
      }
      
      // Also update user streak
      const task = await storage.getDailyTask(req.params.id);
      if (task) {
        await storage.updateUserStreak(task.userId, true);
      }
      
      res.json({ message: "Daily task completed successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to complete daily task" });
    }
  });

  app.get("/api/users/:id/streak", async (req, res) => {
    try {
      const streakData = await storage.getUserStreakData(req.params.id);
      res.json(streakData);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user streak data" });
    }
  });

  // Friendships endpoints
  app.get("/api/friendships", async (req, res) => {
    try {
      const { userId, status } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const friendships = await storage.getUserFriends(userId as string, status as string);
      res.json(friendships);
    } catch (error) {
      res.status(500).json({ message: "Failed to get friendships" });
    }
  });

  app.get("/api/friend-requests", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const requests = await storage.getUserFriendRequests(userId as string);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get friend requests" });
    }
  });

  app.post("/api/friendships", async (req, res) => {
    try {
      const friendshipData = insertFriendshipSchema.parse(req.body);
      const friendship = await storage.createFriendship(friendshipData);
      res.json(friendship);
    } catch (error) {
      res.status(400).json({ message: "Failed to create friendship" });
    }
  });

  app.post("/api/friendships/:id/accept", async (req, res) => {
    try {
      const success = await storage.acceptFriendRequest(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      res.json({ message: "Friend request accepted" });
    } catch (error) {
      res.status(400).json({ message: "Failed to accept friend request" });
    }
  });

  app.post("/api/friendships/:id/reject", async (req, res) => {
    try {
      const success = await storage.rejectFriendRequest(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      res.json({ message: "Friend request rejected" });
    } catch (error) {
      res.status(400).json({ message: "Failed to reject friend request" });
    }
  });

  app.post("/api/users/:userId/block/:friendId", async (req, res) => {
    try {
      const success = await storage.blockUser(req.params.userId, req.params.friendId);
      if (!success) {
        return res.status(400).json({ message: "Failed to block user" });
      }
      res.json({ message: "User blocked successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to block user" });
    }
  });

  app.get("/api/users/:id/friend-leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getFriendLeaderboard(req.params.id);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to get friend leaderboard" });
    }
  });

  // Mini Games endpoints - extend existing games functionality
  app.get("/api/mini-games", async (req, res) => {
    try {
      const miniGames = [
        {
          id: 'word_flash',
          type: 'word_flash',
          title: 'Быстрые слова',
          description: 'Запомните слова за 30 секунд',
          difficulty: 'easy',
          duration: 30,
          config: JSON.stringify({
            wordCount: 10,
            timeLimit: 30,
            categories: ['animals', 'food', 'colors']
          }),
          isActive: true,
        },
        {
          id: 'grammar_sprint',
          type: 'grammar_sprint',
          title: 'Грамматический спринт',
          description: 'Исправьте ошибки за 30 секунд',
          difficulty: 'medium',
          duration: 30,
          config: JSON.stringify({
            sentenceCount: 5,
            timeLimit: 30,
            errorTypes: ['spelling', 'punctuation']
          }),
          isActive: true,
        },
        {
          id: 'accent_quiz',
          type: 'accent_quiz',
          title: 'Ударения за 30 сек',
          description: 'Поставьте правильные ударения',
          difficulty: 'hard',
          duration: 30,
          config: JSON.stringify({
            wordCount: 8,
            timeLimit: 30,
            difficultyLevel: 'intermediate'
          }),
          isActive: true,
        }
      ];
      
      res.json(miniGames);
    } catch (error) {
      res.status(500).json({ message: "Failed to get mini games" });
    }
  });

  // Custom Themes API
  app.get("/api/themes", async (req, res) => {
    try {
      const { authorId, isPublic, isActive } = req.query;
      const filters: any = {};
      
      if (authorId) filters.authorId = authorId as string;
      if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      const themes = await storage.getCustomThemes(filters);
      res.json(themes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get themes" });
    }
  });

  app.post("/api/themes", async (req, res) => {
    try {
      const themeData = insertCustomThemeSchema.parse(req.body);
      const theme = await storage.createCustomTheme({
        ...themeData,
        authorId: req.body.authorId, // Should come from authenticated user
        createdAt: Date.now(),
      });
      res.json(theme);
    } catch (error) {
      res.status(400).json({ message: "Invalid theme data" });
    }
  });

  // User Theme Settings API
  app.get("/api/users/:userId/theme-settings", async (req, res) => {
    try {
      const { userId } = req.params;
      const settings = await storage.getUserThemeSettings(userId);
      res.json(settings || { userId, animationsEnabled: true, backgroundEffects: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to get theme settings" });
    }
  });

  app.put("/api/users/:userId/theme-settings", async (req, res) => {
    try {
      const { userId } = req.params;
      const settings = await storage.updateUserThemeSettings(userId, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update theme settings" });
    }
  });

  // Получить темы пользователя
  app.get("/api/themes/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const themes = await storage.getCustomThemes({ authorId: userId });
      res.json(themes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user themes" });
    }
  });

  // Получить популярные темы
  app.get("/api/themes/popular", async (req, res) => {
    try {
      const themes = await storage.getCustomThemes({ isPublic: true, isActive: true });
      // Сортируем по рейтингу и количеству скачиваний
      const sortedThemes = themes.sort((a, b) => {
        const scoreA = (a.rating || 0) * 10 + (a.downloadCount || 0);
        const scoreB = (b.rating || 0) * 10 + (b.downloadCount || 0);
        return scoreB - scoreA;
      });
      res.json(sortedThemes.slice(0, 20)); // Топ 20
    } catch (error) {
      res.status(500).json({ message: "Failed to get popular themes" });
    }
  });

  // Применить тему к пользователю
  app.post("/api/themes/:themeId/apply", async (req, res) => {
    try {
      const { themeId } = req.params;
      const { userId } = req.body;
      
      // Обновляем настройки пользователя
      const settings = await storage.updateUserThemeSettings(userId, {
        activeThemeId: themeId,
        updatedAt: Date.now(),
      });
      
      // Увеличиваем счетчик скачиваний
      const theme = await storage.getCustomTheme(themeId);
      if (theme) {
        await storage.updateCustomTheme(themeId, {
          downloadCount: (theme.downloadCount || 0) + 1,
        });
      }
      
      res.json({ success: true, settings });
    } catch (error) {
      res.status(500).json({ message: "Failed to apply theme" });
    }
  });

  // Оценить тему
  app.post("/api/themes/:themeId/rate", async (req, res) => {
    try {
      const { themeId } = req.params;
      const { rating } = req.body;
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      
      const theme = await storage.getCustomTheme(themeId);
      if (!theme) {
        return res.status(404).json({ message: "Theme not found" });
      }
      
      // Простое усреднение рейтинга
      const currentRating = theme.rating || 0;
      const currentRatingCount = theme.downloadCount || 1;
      const newRating = (currentRating * currentRatingCount + rating) / (currentRatingCount + 1);
      
      await storage.updateCustomTheme(themeId, {
        rating: Number(newRating.toFixed(1)),
      });
      
      res.json({ success: true, newRating: Number(newRating.toFixed(1)) });
    } catch (error) {
      res.status(500).json({ message: "Failed to rate theme" });
    }
  });

  // Удалить тему
  app.delete("/api/themes/:themeId", async (req, res) => {
    try {
      const { themeId } = req.params;
      const { userId } = req.body;
      
      // Проверяем, что пользователь является автором темы
      const theme = await storage.getCustomTheme(themeId);
      if (!theme) {
        return res.status(404).json({ message: "Theme not found" });
      }
      
      if (theme.authorId !== userId) {
        return res.status(403).json({ message: "You can only delete your own themes" });
      }
      
      await storage.deleteCustomTheme(themeId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete theme" });
    }
  });

  // Video Conferences API
  app.get("/api/video-conferences", async (req, res) => {
    try {
      const { hostId, status } = req.query;
      const filters: any = {};
      
      if (hostId) filters.hostId = hostId as string;
      if (status) filters.status = status as string;
      
      const conferences = await storage.getVideoConferences(filters);
      res.json(conferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to get conferences" });
    }
  });

  app.post("/api/video-conferences", async (req, res) => {
    try {
      const conferenceData = insertVideoConferenceSchema.parse(req.body);
      const conference = await storage.createVideoConference({
        ...conferenceData,
        participants: JSON.stringify([conferenceData.hostId]), // Host joins by default
        createdAt: Date.now(),
      });
      res.json(conference);
    } catch (error) {
      res.status(400).json({ message: "Invalid conference data" });
    }
  });

  app.post("/api/video-conferences/:id/join", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      const success = await storage.joinVideoConference(id, userId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: "Failed to join conference" });
    }
  });

  // Payment Plans API
  app.get("/api/payment-plans", async (req, res) => {
    try {
      const { type, isActive } = req.query;
      const filters: any = {};
      
      if (type) filters.type = type as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      const plans = await storage.getPaymentPlans(filters);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get payment plans" });
    }
  });

  app.post("/api/payment-transactions", async (req, res) => {
    try {
      const transactionData = insertPaymentTransactionSchema.parse(req.body);
      const transaction = await storage.createPaymentTransaction({
        ...transactionData,
        createdAt: Date.now(),
      });
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid transaction data" });
    }
  });

  app.get("/api/users/:userId/transactions", async (req, res) => {
    try {
      const { userId } = req.params;
      const transactions = await storage.getUserPaymentTransactions(userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  return httpServer;
}
