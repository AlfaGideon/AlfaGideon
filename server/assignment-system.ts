
import { randomUUID } from 'crypto';
import { storage } from './storage';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  tutorId: string;
  studentId: string;
  materialType: 'lesson' | 'quiz' | 'theory' | 'custom';
  materialId?: string;
  dueDate: number;
  status: 'pending' | 'submitted' | 'graded' | 'completed';
  priority: 'low' | 'medium' | 'high';
  maxScore?: number;
  currentScore?: number;
  submittedAt?: number;
  gradedAt?: number;
  feedback?: string;
  attachments: AssignmentFile[];
  submissionFiles: AssignmentFile[];
  createdAt: number;
}

export interface AssignmentFile {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'audio' | 'video' | 'image';
  size: number;
  url: string;
  uploadedAt: Date;
}

class AssignmentSystem {
  private assignments: Map<string, Assignment> = new Map();

  async createAssignment(data: Omit<Assignment, 'id' | 'createdAt'>): Promise<Assignment> {
    const assignment: Assignment = {
      ...data,
      id: randomUUID(),
      createdAt: Date.now(),
    };

    this.assignments.set(assignment.id, assignment);

    // Create notification for student
    try {
      const tutor = await storage.getUser(data.tutorId);
      if (tutor) {
        await storage.createNotification({
          userId: data.studentId,
          type: 'assignment',
          title: 'Новое задание',
          message: `${tutor.firstName} ${tutor.lastName} назначил вам: ${data.title}`,
          data: JSON.stringify({ assignmentId: assignment.id }),
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to create assignment notification:', error);
    }

    return assignment;
  }

  async getAssignmentsByStudent(studentId: string): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(a => a.studentId === studentId);
  }

  async getAssignmentsByTutor(tutorId: string): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(a => a.tutorId === tutorId);
  }

  async getAssignment(id: string): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<Assignment | null> {
    const assignment = this.assignments.get(id);
    if (!assignment) return null;

    const updated = { ...assignment, ...updates };
    this.assignments.set(id, updated);
    return updated;
  }

  async submitAssignment(id: string, submissionFiles: AssignmentFile[]): Promise<boolean> {
    const assignment = this.assignments.get(id);
    if (!assignment) return false;

    const updated = {
      ...assignment,
      status: 'submitted' as const,
      submissionFiles,
      submittedAt: Date.now(),
    };

    this.assignments.set(id, updated);

    // Notify tutor about submission
    try {
      const student = await storage.getUser(assignment.studentId);
      if (student) {
        await storage.createNotification({
          userId: assignment.tutorId,
          type: 'assignment_submitted',
          title: 'Задание сдано',
          message: `${student.firstName} ${student.lastName} сдал задание: ${assignment.title}`,
          data: JSON.stringify({ assignmentId: id }),
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to create submission notification:', error);
    }

    return true;
  }

  async gradeAssignment(id: string, score: number, feedback?: string): Promise<boolean> {
    const assignment = this.assignments.get(id);
    if (!assignment) return false;

    const updated = {
      ...assignment,
      status: 'graded' as const,
      currentScore: score,
      feedback,
      gradedAt: Date.now(),
    };

    this.assignments.set(id, updated);

    // Notify student about grade
    try {
      const tutor = await storage.getUser(assignment.tutorId);
      if (tutor) {
        await storage.createNotification({
          userId: assignment.studentId,
          type: 'assignment_graded',
          title: 'Задание проверено',
          message: `${tutor.firstName} ${tutor.lastName} проверил ваше задание: ${assignment.title}. Оценка: ${score}/${assignment.maxScore || 100}`,
          data: JSON.stringify({ assignmentId: id, score }),
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to create grading notification:', error);
    }

    return true;
  }

  // Initialize with some demo data
  async initializeDemoData() {
    const demoStudent = await storage.getUserByUsername('demo_student');
    const demoTeacher = await storage.getUserByUsername('demo_teacher');

    if (!demoStudent || !demoTeacher) return;

    // Pending assignments
    await this.createAssignment({
      title: 'Диалог "В ресторане"',
      description: 'Составьте диалог между клиентом и официантом в ресторане. Используйте новую лексику из урока.',
      tutorId: demoTeacher.id,
      studentId: demoStudent.id,
      materialType: 'custom',
      dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      status: 'pending',
      priority: 'high',
      maxScore: 100,
      attachments: [
        {
          id: randomUUID(),
          name: 'Лексика ресторан.pdf',
          type: 'pdf',
          size: 150000,
          url: '#',
          uploadedAt: new Date()
        }
      ],
      submissionFiles: []
    });

    await this.createAssignment({
      title: 'Аудирование: Новости',
      description: 'Прослушайте новостной сюжет и ответьте на вопросы.',
      tutorId: demoTeacher.id,
      studentId: demoStudent.id,
      materialType: 'custom',
      dueDate: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
      status: 'submitted',
      priority: 'medium',
      maxScore: 80,
      attachments: [
        {
          id: randomUUID(),
          name: 'Новости аудио.mp3',
          type: 'audio',
          size: 2500000,
          url: '#',
          uploadedAt: new Date()
        }
      ],
      submissionFiles: [
        {
          id: randomUUID(),
          name: 'Ответы на вопросы.docx',
          type: 'doc',
          size: 45000,
          url: '#',
          uploadedAt: new Date()
        }
      ]
    });

    // Completed assignment
    const completedAssignment = await this.createAssignment({
      title: 'Грамматические упражнения: Падежи',
      description: 'Выполните упражнения на склонение существительных по падежам.',
      tutorId: demoTeacher.id,
      studentId: demoStudent.id,
      materialType: 'custom',
      dueDate: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      status: 'graded',
      priority: 'medium',
      maxScore: 80,
      currentScore: 75,
      feedback: 'Отличная работа! Небольшие ошибки в творительном падеже, рекомендую повторить эту тему.',
      attachments: [
        {
          id: randomUUID(),
          name: 'Упражнения падежи.pdf',
          type: 'pdf',
          size: 180000,
          url: '#',
          uploadedAt: new Date()
        }
      ],
      submissionFiles: [
        {
          id: randomUUID(),
          name: 'Выполненные упражнения.pdf',
          type: 'pdf',
          size: 200000,
          url: '#',
          uploadedAt: new Date()
        }
      ]
    });

    // Set graded timestamp
    if (completedAssignment) {
      this.assignments.set(completedAssignment.id, {
        ...completedAssignment,
        submittedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
        gradedAt: Date.now() - 1 * 24 * 60 * 60 * 1000
      });
    }
  }
}

export const assignmentSystem = new AssignmentSystem();

// Initialize demo data
assignmentSystem.initializeDemoData();
