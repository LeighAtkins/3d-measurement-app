import logger from './logger.js';

export class GPUQuotaService {
  constructor(db) {
    this.db = db;
    this.DAILY_LIMIT = 31; // Based on 25min / 48sec per generation
    this.SECONDS_PER_GENERATION = 48;
  }

  /**
   * Get current daily quota status
   * @returns {Promise<Object>} Current quota information
   */
  async getCurrentQuota() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Get or create today's usage record
      const result = await this.db.query(`
        INSERT INTO gpu_usage_log (date) 
        VALUES ($1) 
        ON CONFLICT (date) DO NOTHING 
        RETURNING *;
      `, [today]);

      // Fetch current usage
      const usageResult = await this.db.query(
        'SELECT * FROM gpu_usage_log WHERE date = $1',
        [today]
      );

      const usage = usageResult.rows[0];
      
      const quota = {
        dailyLimit: this.DAILY_LIMIT,
        used: usage.generation_count,
        remaining: Math.max(0, this.DAILY_LIMIT - usage.generation_count),
        resetTime: this.getNextResetTime(),
        secondsUsed: usage.total_seconds_used,
        percentUsed: Math.round((usage.generation_count / this.DAILY_LIMIT) * 100)
      };

      // If over limit, get queue position
      if (quota.remaining === 0) {
        quota.queuePosition = await this.getQueuePosition();
        quota.estimatedProcessingTime = this.getEstimatedProcessingTime(quota.queuePosition);
      }

      return quota;
    } catch (error) {
      logger.error('Error getting GPU quota', { error: error.message });
      throw new Error('Failed to get quota information');
    }
  }

  /**
   * Check if generation can proceed immediately
   * @returns {Promise<boolean>} Whether generation can start now
   */
  async canGenerateNow() {
    const quota = await this.getCurrentQuota();
    return quota.remaining > 0;
  }

  /**
   * Reserve a generation slot (either immediate or queued)
   * @param {string} orderId - Order ID requesting generation
   * @param {Array<string>} photoIds - Photo IDs to use for generation
   * @param {Object} options - Generation options (seed, quality, etc.)
   * @returns {Promise<Object>} Reservation result
   */
  async reserveGeneration(orderId, photoIds, options = {}) {
    const canProceed = await this.canGenerateNow();
    
    if (canProceed) {
      // Reserve immediate slot
      await this.recordGenerationStart(orderId);
      return {
        type: 'immediate',
        canProceed: true,
        message: 'Generation can start immediately'
      };
    } else {
      // Add to queue
      const queueResult = await this.addToQueue(orderId, photoIds, options);
      return {
        type: 'queued',
        canProceed: false,
        queuePosition: queueResult.position,
        scheduledDate: queueResult.scheduledDate,
        estimatedTime: queueResult.estimatedTime,
        message: `Daily limit reached. Your generation is queued for tomorrow at position #${queueResult.position}`
      };
    }
  }

  /**
   * Record the start of a generation (increments daily count)
   * @param {string} orderId - Order ID
   */
  async recordGenerationStart(orderId) {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await this.db.query(`
        UPDATE gpu_usage_log 
        SET generation_count = generation_count + 1,
            total_seconds_used = total_seconds_used + $2
        WHERE date = $1
      `, [today, this.SECONDS_PER_GENERATION]);

      logger.info('GPU generation started', { orderId, date: today });
    } catch (error) {
      logger.error('Error recording generation start', { error: error.message, orderId });
      throw error;
    }
  }

  /**
   * Add generation request to queue for tomorrow
   * @param {string} orderId - Order ID
   * @param {Array<string>} photoIds - Photo IDs
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Queue information
   */
  async addToQueue(orderId, photoIds, options) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDate = tomorrow.toISOString().split('T')[0];

    try {
      // Get next queue position for tomorrow
      const positionResult = await this.db.query(`
        SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position
        FROM generation_queue 
        WHERE scheduled_date = $1 AND status = 'queued'
      `, [scheduledDate]);

      const position = positionResult.rows[0].next_position;

      // Add to queue
      await this.db.query(`
        INSERT INTO generation_queue (order_id, photo_ids, generation_options, queue_position, scheduled_date)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, photoIds, JSON.stringify(options), position, scheduledDate]);

      const estimatedTime = this.getEstimatedProcessingTime(position);

      logger.info('Generation added to queue', { 
        orderId, 
        position, 
        scheduledDate,
        photoCount: photoIds.length 
      });

      return {
        position,
        scheduledDate,
        estimatedTime
      };
    } catch (error) {
      logger.error('Error adding to generation queue', { error: error.message, orderId });
      throw new Error('Failed to queue generation');
    }
  }

  /**
   * Get current queue position for new requests
   * @returns {Promise<number>} Current queue position
   */
  async getQueuePosition() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduledDate = tomorrow.toISOString().split('T')[0];

    const result = await this.db.query(`
      SELECT COUNT(*) + 1 as position
      FROM generation_queue 
      WHERE scheduled_date = $1 AND status = 'queued'
    `, [scheduledDate]);

    return parseInt(result.rows[0].position);
  }

  /**
   * Get estimated processing time based on queue position
   * @param {number} position - Position in queue
   * @returns {Date} Estimated processing time
   */
  getEstimatedProcessingTime(position) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Start of day
    
    // Estimate: 48 seconds per generation, process in order
    const estimatedSeconds = (position - 1) * this.SECONDS_PER_GENERATION;
    tomorrow.setSeconds(estimatedSeconds);
    
    return tomorrow;
  }

  /**
   * Get next quota reset time (midnight UTC)
   * @returns {Date} Next reset time
   */
  getNextResetTime() {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Process queued generations (called by cron job)
   * @returns {Promise<void>}
   */
  async processQueue() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Get queued items for today, in order
      const queueResult = await this.db.query(`
        SELECT * FROM generation_queue 
        WHERE scheduled_date = $1 AND status = 'queued'
        ORDER BY queue_position ASC
        LIMIT $2
      `, [today, this.DAILY_LIMIT]);

      const queuedItems = queueResult.rows;
      
      logger.info('Processing generation queue', { 
        date: today, 
        queuedCount: queuedItems.length 
      });

      for (const item of queuedItems) {
        await this.processQueuedGeneration(item);
      }
    } catch (error) {
      logger.error('Error processing generation queue', { error: error.message });
    }
  }

  /**
   * Process a single queued generation
   * @param {Object} queueItem - Queue item from database
   */
  async processQueuedGeneration(queueItem) {
    try {
      // Mark as processing
      await this.db.query(`
        UPDATE generation_queue 
        SET status = 'processing', processed_at = NOW()
        WHERE id = $1
      `, [queueItem.id]);

      // Trigger the actual TRELLIS generation
      // This will be called from the existing generation endpoint
      logger.info('Processing queued generation', { 
        orderId: queueItem.order_id,
        queueId: queueItem.id 
      });

      // The actual generation will be handled by the existing TRELLIS service
      // We just need to mark this as ready for processing
    } catch (error) {
      logger.error('Error processing queued generation', { 
        error: error.message, 
        queueId: queueItem.id 
      });
      
      // Mark as failed
      await this.db.query(`
        UPDATE generation_queue 
        SET status = 'failed', processed_at = NOW()
        WHERE id = $1
      `, [queueItem.id]);
    }
  }
}