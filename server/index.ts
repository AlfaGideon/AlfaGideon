// Временное хранилище файлов в памяти
declare global {
  var uploadedFiles: Map<string, any>;
}

// Инициализируем хранилище файлов при старте сервера
if (!global.uploadedFiles) {
  global.uploadedFiles = new Map();
}

// Загружаем существующие файлы с диска в память при старте сервера
async function loadFilesFromDisk() {
  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const avatarsDir = path.join(uploadsDir, 'avatars');

    // Создаем директории если их нет
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(avatarsDir, { recursive: true });

    // Загружаем все файлы из папки avatars
    const files = await fs.readdir(avatarsDir);
    for (const fileName of files) {
      try {
        const filePath = path.join(avatarsDir, fileName);
        const fileBuffer = await fs.readFile(filePath);
        const base64Data = `data:application/octet-stream;base64,${fileBuffer.toString('base64')}`;

        global.uploadedFiles.set(fileName, {
          data: base64Data,
          contentType: 'application/octet-stream', // Будет переопределен при загрузке
          originalName: fileName
        });
      } catch (error) {
        console.log(`Failed to load file ${fileName}:`, error);
      }
    }

    console.log(`Loaded ${global.uploadedFiles.size} files from disk`);
  } catch (error) {
    console.log('Failed to load files from disk:', error);
  }
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeBot } from "../bot/index";
import { FinancialCommunicationIntegration } from './financial-communication-integration';
import { createFinancialSyncRoutes } from './routes/financial-sync';
import { startNotificationScheduler } from "./notification-scheduler";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Загружаем файлы с диска при запуске
  await loadFilesFromDisk();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Start notification scheduler
  startNotificationScheduler();

  // Инициализируем Telegram бота
  try {
    await initializeBot();
    log(`🤖 Telegram бот инициализирован`);
  } catch (error) {
    log(`❌ Ошибка при инициализации бота: ${error}`);
  }
})();