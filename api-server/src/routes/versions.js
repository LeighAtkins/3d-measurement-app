import express from 'express';
import { VersionService } from '../versionService.js';
import logger from '../logger.js';

const router = express.Router();

// Initialize version service with database connection
let versionService;

router.use((req, res, next) => {
  if (!versionService) {
    versionService = new VersionService(req.app.locals.db);
  }
  next();
});

/**
 * GET /api/orders/:orderId/versions
 * Get all versions for an order
 */
router.get('/orders/:orderId/versions', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { includeArchived = 'false' } = req.query;
    
    const result = await versionService.getVersions(
      orderId, 
      includeArchived === 'true'
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting versions', { error: error.message });
    res.status(500).json({ error: 'Failed to get versions' });
  }
});

/**
 * POST /api/versions/:attemptId/archive
 * Archive a specific version
 */
router.post('/versions/:attemptId/archive', async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { reason = 'manual' } = req.body;
    
    await versionService.archiveVersion(attemptId, reason);
    
    res.json({ 
      success: true, 
      message: 'Version archived successfully' 
    });
  } catch (error) {
    logger.error('Error archiving version', { error: error.message });
    res.status(500).json({ error: 'Failed to archive version' });
  }
});

/**
 * POST /api/versions/:attemptId/restore
 * Restore an archived version
 */
router.post('/versions/:attemptId/restore', async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    const result = await versionService.restoreVersion(attemptId);
    
    res.json({
      success: true,
      message: 'Version restored successfully',
      ...result
    });
  } catch (error) {
    logger.error('Error restoring version', { error: error.message });
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

/**
 * POST /api/orders/:orderId/versions/cleanup-quality
 * Archive low quality versions for an order
 */
router.post('/orders/:orderId/versions/cleanup-quality', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { minQualityScore = 0.3 } = req.body;
    
    const result = await versionService.archiveLowQualityVersions(
      orderId, 
      minQualityScore
    );
    
    res.json({
      success: true,
      message: `Archived ${result.archivedCount} low quality versions`,
      ...result
    });
  } catch (error) {
    logger.error('Error cleaning up quality versions', { error: error.message });
    res.status(500).json({ error: 'Failed to cleanup versions' });
  }
});

/**
 * GET /api/admin/version-stats
 * Get version statistics for admin dashboard
 */
router.get('/admin/version-stats', async (req, res) => {
  try {
    const stats = await versionService.getVersionStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting version stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get version statistics' });
  }
});

/**
 * POST /api/admin/cleanup-archives
 * Cleanup old archived versions (admin only)
 */
router.post('/admin/cleanup-archives', async (req, res) => {
  try {
    const result = await versionService.cleanupOldArchives();
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} old archived versions`,
      ...result
    });
  } catch (error) {
    logger.error('Error cleaning up archives', { error: error.message });
    res.status(500).json({ error: 'Failed to cleanup archives' });
  }
});

/**
 * GET /api/generation-queue/status
 * Get current queue status
 */
router.get('/generation-queue/status', async (req, res) => {
  try {
    const gpuQuotaService = req.app.locals.gpuQuotaService;
    if (!gpuQuotaService) {
      return res.status(503).json({ error: 'GPU quota service not available' });
    }

    const quota = await gpuQuotaService.getCurrentQuota();
    
    res.json({
      quota,
      canGenerateNow: quota.remaining > 0,
      nextAvailableSlot: quota.remaining > 0 ? 'now' : quota.resetTime
    });
  } catch (error) {
    logger.error('Error getting queue status', { error: error.message });
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

/**
 * GET /api/orders/:orderId/queue-position
 * Get queue position for a specific order
 */
router.get('/orders/:orderId/queue-position', async (req, res) => {
  try {
    const { orderId } = req.params;
    const gpuQuotaService = req.app.locals.gpuQuotaService;
    
    if (!gpuQuotaService) {
      return res.status(503).json({ error: 'GPU quota service not available' });
    }

    // Check if order has queued generation
    const db = req.app.locals.db;
    const result = await db.query(`
      SELECT * FROM generation_queue 
      WHERE order_id = $1 AND status = 'queued'
      ORDER BY created_at DESC
      LIMIT 1
    `, [orderId]);

    if (result.rows.length === 0) {
      return res.json({
        inQueue: false,
        message: 'No queued generation found for this order'
      });
    }

    const queueItem = result.rows[0];
    const estimatedTime = gpuQuotaService.getEstimatedProcessingTime(queueItem.queue_position);

    res.json({
      inQueue: true,
      queuePosition: queueItem.queue_position,
      scheduledDate: queueItem.scheduled_date,
      estimatedTime,
      createdAt: queueItem.created_at
    });
  } catch (error) {
    logger.error('Error getting queue position', { error: error.message });
    res.status(500).json({ error: 'Failed to get queue position' });
  }
});

/**
 * Middleware to check version limits before creating new generation
 * This should be called before starting a new generation
 */
export async function checkVersionLimits(req, res, next) {
  try {
    if (!versionService) {
      versionService = new VersionService(req.app.locals.db);
    }
    
    const { orderId } = req.params;
    
    if (orderId) {
      const manageResult = await versionService.checkAndManageVersions(orderId);
      
      // Add version management info to request for later use
      req.versionManagement = manageResult;
      
      if (manageResult.needsArchiving) {
        logger.info('Auto-archived version for new generation', {
          orderId,
          ...manageResult
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error checking version limits', { error: error.message });
    // Don't block the generation, just log the error
    next();
  }
}

export default router;