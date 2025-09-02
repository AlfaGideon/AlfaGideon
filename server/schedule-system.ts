
import { randomUUID } from 'crypto';
import { storage } from './storage';

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  tutorId: string;
  studentId: string;
  date: number;
  duration: number; // in minutes
  status: 'scheduled' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  subject: string;
  isOnline: boolean;
  location?: string;
  maxScore?: number;
  currentScore?: number;
  submittedAt?: number;
  gradedAt?: number;
  feedback?: string;
  attachments: ScheduleFile[];
  submissionFiles: ScheduleFile[];
  createdAt: number;
}

export interface GroupClass {
  id: string;
  title: string;
  description: string;
  tutor: string;
  date: number;
  duration: number;
  participants: number;
  maxParticipants: number;
  price: number;
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface ScheduleFile {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'audio' | 'video' | 'image';
  size: number;
  url: string;
  uploadedAt: Date;
}

class ScheduleSystem {
  private events: Map<string, ScheduleEvent> = new Map();
  private groupClasses: Map<string, GroupClass> = new Map();

  async createEvent(data: Omit<ScheduleEvent, 'id' | 'createdAt'>): Promise<ScheduleEvent> {
    const event: ScheduleEvent = {
      ...data,
      id: randomUUID(),
      createdAt: Date.now(),
    };

    this.events.set(event.id, event);

    // Create notification for student
    try {
      const tutor = await storage.getUser(data.tutorId);
      if (tutor) {
        await storage.createNotification({
          userId: data.studentId,
          type: 'lesson_scheduled',
          title: 'Новый урок запланирован',
          message: `${tutor.firstName} ${tutor.lastName} запланировал урок: ${data.title}`,
          data: JSON.stringify({ eventId: event.id }),
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to create schedule notification:', error);
    }

    return event;
  }

  async getEventsByStudent(studentId: string): Promise<ScheduleEvent[]> {
    return Array.from(this.events.values()).filter(e => e.studentId === studentId);
  }

  async getEventsByTutor(tutorId: string): Promise<ScheduleEvent[]> {
    return Array.from(this.events.values()).filter(e => e.tutorId === tutorId);
  }

  async getGroupClasses(): Promise<GroupClass[]> {
    return Array.from(this.groupClasses.values());
  }

  async createGroupClass(data: Omit<GroupClass, 'id'>): Promise<GroupClass> {
    const groupClass: GroupClass = {
      ...data,
      id: randomUUID(),
    };

    this.groupClasses.set(groupClass.id, groupClass);
    return groupClass;
  }

  // Initialize with demo data
  async initializeDemoData() {
    const demoStudent = await storage.getUserByUsername('demo_student');
    const demoTeacher = await storage.getUserByUsername('demo_teacher');

    if (!demoStudent || !demoTeacher) return;

    // Upcoming lessons
    await this.createEvent({
      title: 'Урок грамматики: Винительный падеж',
      description: 'Изучение винительного падежа с практическими упражнениями',
      tutorId: demoTeacher.id,
      studentId: demoStudent.id,
      date: Date.now() + 2 * 60 * 60 * 1000, // 2 hours from now
      duration: 60,
      status: 'scheduled',
      priority: 'high',
      subject: 'Грамматика',
      isOnline: true,
      attachments: [],
      submissionFiles: []
    });

    await this.createEvent({
      title: 'Разговорная практика',
      description: 'Практика диалогов в повседневных ситуациях',
      tutorId: demoTeacher.id,
      studentId: demoStudent.id,
      date: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
      duration: 45,
      status: 'scheduled',
      priority: 'medium',
      subject: 'Разговорная практика',
      isOnline: false,
      location: 'Кабинет 102',
      attachments: [],
      submissionFiles: []
    });

    // Completed lesson
    await this.createEvent({
      title: 'Урок литературы: Пушкин',
      description: 'Анализ произведений А.С. Пушкина',
      tutorId: demoTeacher.id,
      studentId: demoStudent.id,
      date: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
      duration: 60,
      status: 'completed',
      priority: 'medium',
      subject: 'Литература',
      isOnline: false,
      location: 'Кабинет 205',
      attachments: [],
      submissionFiles: []
    });

    // Group classes
    await this.createGroupClass({
      title: 'Интенсив по произношению',
      description: 'Улучшите произношение с носителем языка',
      tutor: 'Дмитрий Козлов',
      date: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
      duration: 120,
      participants: 6,
      maxParticipants: 10,
      price: 1500,
      subject: 'Фонетика',
      level: 'intermediate'
    });

    await this.createGroupClass({
      title: 'Бизнес-русский',
      description: 'Деловая лексика и этикет',
      tutor: 'Ольга Смирнова',
      date: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
      duration: 90,
      participants: 4,
      maxParticipants: 8,
      price: 2000,
      subject: 'Деловой русский',
      level: 'advanced'
    });
  }
}

export const scheduleSystem = new ScheduleSystem();

// Initialize demo data
scheduleSystem.initializeDemoData();
