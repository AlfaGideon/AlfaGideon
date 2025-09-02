import { Router } from 'express';
import { z } from 'zod';
import { FinancialCommunicationIntegration } from '../financial-communication-integration';

export function createFinancialSyncRoutes(integration: FinancialCommunicationIntegration) {
  const router = Router();

  // Payment processing with sync validation
  router.post('/payment/process', async (req, res) => {
    try {
      const PaymentSchema = z.object({
        transactionId: z.string(),
        userId: z.string(),
        amount: z.number().positive(),
        currency: z.string().default('RUB'),
        status: z.enum(['pending', 'success', 'failed', 'refunded']),
        timestamp: z.number().optional().default(() => Date.now()),
        metadata: z.record(z.any()).optional()
      });

      const paymentData = PaymentSchema.parse(req.body);
      const result = await integration.processPaymentWithSync(paymentData);

      if (result.success) {
        res.json({
          success: true,
          transactionId: result.transactionId,
          conflicts: result.conflicts,
          notifications: result.notifications,
          message: 'Payment processed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          transactionId: result.transactionId,
          conflicts: result.conflicts,
          notifications: result.notifications,
          message: 'Payment processing failed due to conflicts'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Process pending communications
  router.post('/communications/process', async (req, res) => {
    try {
      const result = await integration.processPendingCommunications();
      
      res.json({
        success: true,
        processed: result.processed,
        failed: result.failed,
        retries: result.retries,
        message: `Processed ${result.processed} communications, ${result.failed} failed, ${result.retries} retried`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to process communications',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get sync status
  router.get('/status', async (req, res) => {
    try {
      const status = integration.getSyncStatus();
      
      res.json({
        success: true,
        status,
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get sync status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual conflict resolution
  router.post('/conflicts/:transactionId/resolve', async (req, res) => {
    try {
      const ResolutionSchema = z.object({
        action: z.enum(['accept_new', 'keep_existing', 'merge']),
        metadata: z.record(z.any()).optional()
      });

      const { transactionId } = req.params;
      const resolution = ResolutionSchema.parse(req.body);
      
      const result = await integration.resolveConflict(transactionId, resolution);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to resolve conflict',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Webhook for external payment providers
  router.post('/webhook/payment', async (req, res) => {
    try {
      // Validate webhook signature (implement based on payment provider)
      const signature = req.headers['x-webhook-signature'] as string;
      if (!signature) {
        return res.status(401).json({ message: 'Missing webhook signature' });
      }

      // Process webhook payload
      const paymentData = {
        transactionId: req.body.transaction_id,
        userId: req.body.user_id,
        amount: req.body.amount,
        currency: req.body.currency || 'RUB',
        status: req.body.status,
        timestamp: req.body.timestamp || Date.now(),
        metadata: req.body.metadata
      };

      const result = await integration.processPaymentWithSync(paymentData);
      
      // Always return 200 to payment provider to prevent retries
      res.json({
        received: true,
        processed: result.success,
        transactionId: result.transactionId
      });
      
    } catch (error) {
      // Log error but still return 200 to prevent payment provider retries
      console.error('Webhook processing error:', error);
      res.json({
        received: true,
        processed: false,
        error: 'Processing failed'
      });
    }
  });

  // Health check endpoint
  router.get('/health', async (req, res) => {
    try {
      const status = integration.getSyncStatus();
      const healthy = status.healthy;
      
      res.status(healthy ? 200 : 503).json({
        healthy,
        status: healthy ? 'operational' : 'degraded',
        details: {
          lastPaymentSync: new Date(status.lastSync.payment).toISOString(),
          lastCommunicationSync: new Date(status.lastSync.communication).toISOString(),
          pendingNotifications: status.pendingCount,
          conflictRate: status.conflicts.total > 0 ? 
            ((status.conflicts.total - status.conflicts.resolved) / status.conflicts.total * 100).toFixed(2) + '%' : '0%',
          successRate: status.performance.successRate.toFixed(2) + '%'
        }
      });
    } catch (error) {
      res.status(500).json({
        healthy: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}