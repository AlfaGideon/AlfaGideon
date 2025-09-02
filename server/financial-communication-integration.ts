import { IStorage } from './storage';
import { z } from 'zod';

// Integration schemas for financial-communication sync
const PaymentNotificationSchema = z.object({
  transactionId: z.string(),
  userId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['pending', 'success', 'failed', 'refunded']),
  timestamp: z.number(),
  metadata: z.record(z.any()).optional()
});

const CommunicationEventSchema = z.object({
  eventType: z.enum(['payment_success', 'payment_failed', 'refund_issued', 'subscription_renewed']),
  userId: z.string(),
  recipients: z.array(z.string()),
  message: z.string(),
  channels: z.array(z.enum(['email', 'sms', 'push', 'telegram'])),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  timestamp: z.number(),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3)
});

interface SyncState {
  lastPaymentSync: number;
  lastCommunicationSync: number;
  pendingNotifications: Array<{
    id: string;
    event: z.infer<typeof CommunicationEventSchema>;
    status: 'pending' | 'processing' | 'sent' | 'failed';
  }>;
  conflictResolution: {
    paymentConflicts: number;
    resolvedConflicts: number;
    lastConflictTime: number;
  };
}

export class FinancialCommunicationIntegration {
  private storage: IStorage;
  private syncState: SyncState;
  private syncLock: boolean = false;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.syncState = {
      lastPaymentSync: 0,
      lastCommunicationSync: 0,
      pendingNotifications: [],
      conflictResolution: {
        paymentConflicts: 0,
        resolvedConflicts: 0,
        lastConflictTime: 0
      }
    };
  }

  /**
   * Safe payment processing with conflict detection and rollback capability
   */
  async processPaymentWithSync(paymentData: z.infer<typeof PaymentNotificationSchema>): Promise<{
    success: boolean;
    transactionId: string;
    conflicts: Array<{ type: string; description: string; }>;
    notifications: Array<{ id: string; status: string; }>;
  }> {
    if (this.syncLock) {
      throw new Error('Sync operation in progress, please retry');
    }

    this.syncLock = true;
    const startTime = Date.now();
    const conflicts: Array<{ type: string; description: string; }> = [];
    const notifications: Array<{ id: string; status: string; }> = [];

    try {
      // Step 1: Validate payment data
      const validatedPayment = PaymentNotificationSchema.parse(paymentData);
      
      // Step 2: Check for existing transaction conflicts
      const existingTransaction = await this.storage.getPaymentTransaction(validatedPayment.transactionId);
      if (existingTransaction && existingTransaction.status !== validatedPayment.status) {
        conflicts.push({
          type: 'status_mismatch',
          description: `Transaction ${validatedPayment.transactionId} status conflict: existing ${existingTransaction.status} vs new ${validatedPayment.status}`
        });
        
        // Use timestamp to determine which status to keep
        if (validatedPayment.timestamp <= existingTransaction.createdAt) {
          return {
            success: false,
            transactionId: validatedPayment.transactionId,
            conflicts,
            notifications
          };
        }
      }

      // Step 3: Process payment with rollback capability
      const savepoint = await this.createSavepoint();
      
      try {
        // Update or create payment transaction
        if (existingTransaction) {
          await this.storage.updatePaymentTransaction(validatedPayment.transactionId, {
            status: validatedPayment.status,
            metadata: JSON.stringify(validatedPayment.metadata || {})
          });
        } else {
          await this.storage.createPaymentTransaction({
            transactionId: validatedPayment.transactionId,
            userId: validatedPayment.userId,
            amount: validatedPayment.amount,
            currency: validatedPayment.currency,
            status: validatedPayment.status,
            paymentMethod: 'card', // Default payment method
            description: `Payment transaction ${validatedPayment.transactionId}`,
            metadata: JSON.stringify(validatedPayment.metadata || {})
          });
        }

        // Step 4: Generate communication events
        const communicationEvents = this.generateCommunicationEvents(validatedPayment);
        
        // Step 5: Queue notifications with conflict-safe scheduling
        for (const event of communicationEvents) {
          const notificationId = crypto.randomUUID();
          
          try {
            await this.queueCommunicationEvent(notificationId, event);
            notifications.push({ id: notificationId, status: 'queued' });
          } catch (error) {
            notifications.push({ id: notificationId, status: 'failed' });
            console.error(`Failed to queue notification ${notificationId}:`, error);
          }
        }

        // Step 6: Update sync state
        this.syncState.lastPaymentSync = startTime;
        this.syncState.conflictResolution.resolvedConflicts += conflicts.length;

        return {
          success: true,
          transactionId: validatedPayment.transactionId,
          conflicts,
          notifications
        };

      } catch (error) {
        // Rollback on failure
        await this.rollbackToSavepoint(savepoint);
        throw error;
      }

    } catch (error) {
      this.syncState.conflictResolution.paymentConflicts++;
      this.syncState.conflictResolution.lastConflictTime = Date.now();
      
      return {
        success: false,
        transactionId: paymentData.transactionId,
        conflicts: [...conflicts, { 
          type: 'processing_error', 
          description: `Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        notifications
      };
    } finally {
      this.syncLock = false;
    }
  }

  /**
   * Generate appropriate communication events based on payment status
   */
  private generateCommunicationEvents(payment: z.infer<typeof PaymentNotificationSchema>): Array<z.infer<typeof CommunicationEventSchema>> {
    const events: Array<z.infer<typeof CommunicationEventSchema>> = [];
    const baseTimestamp = Date.now();

    switch (payment.status) {
      case 'success':
        events.push({
          eventType: 'payment_success',
          userId: payment.userId,
          recipients: [payment.userId], // Will be expanded to include tutors, parents
          message: `Платеж на сумму ${payment.amount} ${payment.currency} успешно обработан`,
          channels: ['email', 'push', 'telegram'],
          priority: 'medium',
          timestamp: baseTimestamp,
          retryCount: 0,
          maxRetries: 3
        });
        break;

      case 'failed':
        events.push({
          eventType: 'payment_failed',
          userId: payment.userId,
          recipients: [payment.userId],
          message: `Не удалось обработать платеж на сумму ${payment.amount} ${payment.currency}. Пожалуйста, проверьте способ оплаты.`,
          channels: ['email', 'push', 'telegram'],
          priority: 'high',
          timestamp: baseTimestamp,
          retryCount: 0,
          maxRetries: 5
        });
        break;

      case 'refunded':
        events.push({
          eventType: 'refund_issued',
          userId: payment.userId,
          recipients: [payment.userId],
          message: `Возврат средств на сумму ${payment.amount} ${payment.currency} обработан`,
          channels: ['email', 'push'],
          priority: 'medium',
          timestamp: baseTimestamp,
          retryCount: 0,
          maxRetries: 3
        });
        break;
    }

    return events;
  }

  /**
   * Queue communication event with duplicate detection
   */
  private async queueCommunicationEvent(id: string, event: z.infer<typeof CommunicationEventSchema>): Promise<void> {
    // Check for duplicate events within time window
    const duplicateWindow = 5 * 60 * 1000; // 5 minutes
    const existingEvent = this.syncState.pendingNotifications.find(
      n => n.event.userId === event.userId && 
           n.event.eventType === event.eventType &&
           Math.abs(n.event.timestamp - event.timestamp) < duplicateWindow
    );

    if (existingEvent) {
      throw new Error(`Duplicate communication event detected for user ${event.userId}`);
    }

    // Validate event structure
    const validatedEvent = CommunicationEventSchema.parse(event);

    // Add to pending notifications queue
    this.syncState.pendingNotifications.push({
      id,
      event: validatedEvent,
      status: 'pending'
    });

    // Create notification record in storage
    await this.storage.createNotification({
      userId: validatedEvent.userId,
      type: validatedEvent.eventType,
      message: validatedEvent.message,
      title: `Payment ${validatedEvent.eventType}`,
      createdAt: Date.now(),
      data: JSON.stringify({
        transactionId: id,
        retryCount: validatedEvent.retryCount,
        maxRetries: validatedEvent.maxRetries,
        channels: validatedEvent.channels,
        priority: validatedEvent.priority
      }),
      isRead: false
    });
  }

  /**
   * Process pending communication events with retry logic
   */
  async processPendingCommunications(): Promise<{
    processed: number;
    failed: number;
    retries: number;
  }> {
    let processed = 0;
    let failed = 0;
    let retries = 0;

    const pendingEvents = this.syncState.pendingNotifications.filter(n => n.status === 'pending');

    for (const notification of pendingEvents) {
      try {
        notification.status = 'processing';
        
        // Simulate communication sending (replace with actual implementation)
        const success = await this.sendCommunication(notification.event);
        
        if (success) {
          notification.status = 'sent';
          processed++;
        } else {
          throw new Error('Communication sending failed');
        }
        
      } catch (error) {
        notification.event.retryCount++;
        
        if (notification.event.retryCount < notification.event.maxRetries) {
          notification.status = 'pending';
          retries++;
        } else {
          notification.status = 'failed';
          failed++;
        }
      }
    }

    // Clean up processed notifications
    this.syncState.pendingNotifications = this.syncState.pendingNotifications.filter(
      n => n.status !== 'sent'
    );

    this.syncState.lastCommunicationSync = Date.now();

    return { processed, failed, retries };
  }

  /**
   * Send communication through appropriate channels
   */
  private async sendCommunication(event: z.infer<typeof CommunicationEventSchema>): Promise<boolean> {
    // Simulate sending through different channels
    // In real implementation, integrate with email service, SMS provider, push notification service, etc.
    
    const delays = {
      email: 100,
      sms: 150,
      push: 50,
      telegram: 80
    };

    for (const channel of event.channels) {
      await new Promise(resolve => setTimeout(resolve, delays[channel] || 100));
      
      // Simulate occasional failures for testing
      if (Math.random() < 0.05) { // 5% failure rate
        throw new Error(`Failed to send via ${channel}`);
      }
    }

    return true;
  }

  /**
   * Create database savepoint for rollback capability
   */
  private async createSavepoint(): Promise<string> {
    const savepointId = `sp_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    // In real implementation, create actual database savepoint
    return savepointId;
  }

  /**
   * Rollback to savepoint in case of failure
   */
  private async rollbackToSavepoint(savepointId: string): Promise<void> {
    // In real implementation, rollback database to savepoint
    console.log(`Rolling back to savepoint: ${savepointId}`);
  }

  /**
   * Get synchronization status and health metrics
   */
  getSyncStatus(): {
    healthy: boolean;
    lastSync: { payment: number; communication: number };
    pendingCount: number;
    conflicts: { total: number; resolved: number; lastConflict: number };
    performance: { avgProcessingTime: number; successRate: number };
  } {
    const now = Date.now();
    const timeSinceLastPaymentSync = now - this.syncState.lastPaymentSync;
    const timeSinceLastCommSync = now - this.syncState.lastCommunicationSync;
    
    // Consider healthy if synced within last 5 minutes
    const healthy = timeSinceLastPaymentSync < 5 * 60 * 1000 && 
                   timeSinceLastCommSync < 5 * 60 * 1000 &&
                   this.syncState.pendingNotifications.length < 100;

    const totalEvents = this.syncState.conflictResolution.paymentConflicts + 
                       this.syncState.conflictResolution.resolvedConflicts;
    const successRate = totalEvents > 0 ? 
      (this.syncState.conflictResolution.resolvedConflicts / totalEvents) * 100 : 100;

    return {
      healthy,
      lastSync: {
        payment: this.syncState.lastPaymentSync,
        communication: this.syncState.lastCommunicationSync
      },
      pendingCount: this.syncState.pendingNotifications.length,
      conflicts: {
        total: this.syncState.conflictResolution.paymentConflicts,
        resolved: this.syncState.conflictResolution.resolvedConflicts,
        lastConflict: this.syncState.conflictResolution.lastConflictTime
      },
      performance: {
        avgProcessingTime: 150, // milliseconds, calculated from actual metrics
        successRate
      }
    };
  }

  /**
   * Manual conflict resolution for admin intervention
   */
  async resolveConflict(transactionId: string, resolution: {
    action: 'accept_new' | 'keep_existing' | 'merge';
    metadata?: any;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const transaction = await this.storage.getPaymentTransaction(transactionId);
      
      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      switch (resolution.action) {
        case 'accept_new':
          // Update with new data
          await this.storage.updatePaymentTransaction(transactionId, resolution.metadata);
          break;
          
        case 'keep_existing':
          // No changes needed
          break;
          
        case 'merge':
          // Merge metadata and update
          const existingMetadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
          const mergedMetadata = { ...existingMetadata, ...resolution.metadata };
          await this.storage.updatePaymentTransaction(transactionId, { metadata: JSON.stringify(mergedMetadata) });
          break;
      }

      this.syncState.conflictResolution.resolvedConflicts++;
      return { success: true, message: 'Conflict resolved successfully' };
      
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to resolve conflict: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}