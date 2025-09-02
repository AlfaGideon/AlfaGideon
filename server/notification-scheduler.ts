import { storage } from './storage';
import cron from 'node-cron';

interface ScheduledLesson {
  id: string;
  studentId: string;
  tutorId: string;
  title: string;
  scheduledAt: number; // Unix timestamp
  type: 'individual' | 'group';
  duration: number; // minutes
}

// Функция для получения запланированных занятий (заглушка)
async function getScheduledLessons(): Promise<ScheduledLesson[]> {
  // В реальном приложении здесь будет запрос к базе данных
  // Пока возвращаем тестовые данные
  const now = Date.now();
  const tomorrow = now + 24 * 60 * 60 * 1000;

  return [
    {
      id: 'lesson-1',
      studentId: 'demo_student_id',
      tutorId: 'demo_teacher_id',
      title: 'Урок грамматики',
      scheduledAt: tomorrow,
      type: 'individual',
      duration: 60
    }
  ];
}

// Функция для отправки уведомления
async function sendLessonNotification(
  userId: string,
  title: string,
  message: string,
  lessonData: any
) {
  try {
    // Проверяем существование пользователя перед созданием уведомления
    const user = await storage.getUser(userId);
    if (!user) {
      console.warn(`Попытка создать уведомление для несуществующего пользователя: ${userId}`);
      return;
    }

    await storage.createNotification({
      userId,
      type: 'lesson_reminder',
      title,
      message,
      data: JSON.stringify(lessonData),
      createdAt: Date.now(),
    });
    console.log(`📅 Отправлено уведомление: ${title} для пользователя ${userId}`);
  } catch (error) {
    console.error('Ошибка отправки уведомления:', error);
  }
}

// Функция проверки и отправки уведомлений
async function checkAndSendNotifications() {
  try {
    const lessons = await getScheduledLessons();
    const now = Date.now();

    for (const lesson of lessons) {
      const timeUntilLesson = lesson.scheduledAt - now;
      const hoursUntilLesson = timeUntilLesson / (1000 * 60 * 60);

      // Форматирование времени урока
      const lessonTime = new Date(lesson.scheduledAt).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });

      const lessonData = {
        lessonId: lesson.id,
        tutorId: lesson.tutorId,
        studentId: lesson.studentId,
        scheduledAt: lesson.scheduledAt,
        type: lesson.type
      };

      // Уведомление за 24 часа
      if (hoursUntilLesson <= 24.5 && hoursUntilLesson > 23.5) {
        await sendLessonNotification(
          lesson.studentId,
          '📅 Напоминание о занятии',
          `Завтра у вас урок "${lesson.title}" в ${lessonTime}. Не забудьте подготовиться!`,
          lessonData
        );

        // Уведомление преподавателю
        await sendLessonNotification(
          lesson.tutorId,
          '📅 Напоминание о занятии',
          `Завтра у вас урок "${lesson.title}" с учеником в ${lessonTime}`,
          lessonData
        );
      }

      // Уведомление за 12 часов
      if (hoursUntilLesson <= 12.5 && hoursUntilLesson > 11.5) {
        await sendLessonNotification(
          lesson.studentId,
          '⏰ Урок через 12 часов',
          `Урок "${lesson.title}" начнется в ${lessonTime}. Время подготовиться!`,
          lessonData
        );

        await sendLessonNotification(
          lesson.tutorId,
          '⏰ Урок через 12 часов',
          `Урок "${lesson.title}" начнется в ${lessonTime}. Проверьте материалы`,
          lessonData
        );
      }

      // Уведомление за 1 час
      if (hoursUntilLesson <= 1.5 && hoursUntilLesson > 0.5) {
        await sendLessonNotification(
          lesson.studentId,
          '🔔 Урок через час!',
          `Урок "${lesson.title}" начнется через час в ${lessonTime}. Подготовьтесь к занятию!`,
          lessonData
        );

        await sendLessonNotification(
          lesson.tutorId,
          '🔔 Урок через час!',
          `Урок "${lesson.title}" начнется через час в ${lessonTime}. Время начинать!`,
          lessonData
        );
      }
    }
  } catch (error) {
    console.error('Ошибка при проверке уведомлений:', error);
  }
}

// Запуск планировщика (каждые 30 минут)
export function startNotificationScheduler() {
  console.log('🔔 Запуск планировщика уведомлений о занятиях...');

  // Проверяем уведомления каждые 30 минут
  cron.schedule('*/30 * * * *', async () => {
    console.log('🔍 Проверка предстоящих занятий для уведомлений...');
    await checkAndSendNotifications();
  });

  // Также запускаем проверку сразу при старте
  setTimeout(checkAndSendNotifications, 5000);
}

// Функция для ручного тестирования уведомлений
export async function testNotifications(userId: string) {
  const testLessonData = {
    lessonId: 'test-lesson',
    tutorId: 'demo_teacher_id',
    studentId: userId,
    scheduledAt: Date.now() + 60 * 60 * 1000, // через час
    type: 'individual'
  };

  await sendLessonNotification(
    userId,
    '🧪 Тестовое уведомление',
    'Это тестовое уведомление о предстоящем занятии',
    testLessonData
  );
}