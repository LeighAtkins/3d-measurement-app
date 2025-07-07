import logger from './logger.js';

export class VersionService {
  constructor(db) {
    this.db = db;
    this.VERSION_SOFT_LIMIT = 5;
    this.ARCHIVE_RETENTION_DAYS = 90;
  }

  /**
   * Check if new version would exceed limit and auto-archive if needed
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Archive operation result
   */
  async checkAndManageVersions(orderId) {
    try {
      // Get all non-archived versions for this order
      const versionsResult = await this.db.query(`
        SELECT id, attempt_number, model_quality_score, selected, created_at
        FROM generation_attempts 
        WHERE order_id = $1 AND archived = false AND status = 'completed'
        ORDER BY created_at ASC
      `, [orderId]);

      const versions = versionsResult.rows;
      
      if (versions.length < this.VERSION_SOFT_LIMIT) {
        return {
          needsArchiving: false,
          message: `${versions.length}/${this.VERSION_SOFT_LIMIT} versions used`
        };
      }

      // Find version to archive (oldest non-selected version)
      const candidateForArchive = versions.find(v => !v.selected);
      
      if (!candidateForArchive) {
        // All versions are selected, archive the oldest one anyway
        const oldestVersion = versions[0];
        await this.archiveVersion(oldestVersion.id, 'version_limit');
        
        return {
          needsArchiving: true,
          archivedVersion: oldestVersion.attempt_number,
          message: `Archived version ${oldestVersion.attempt_number} (oldest) to make room`
        };
      } else {
        await this.archiveVersion(candidateForArchive.id, 'version_limit');
        
        return {
          needsArchiving: true,
          archivedVersion: candidateForArchive.attempt_number,
          message: `Archived version ${candidateForArchive.attempt_number} to make room`
        };
      }
    } catch (error) {
      logger.error('Error managing versions', { error: error.message, orderId });
      throw new Error('Failed to manage versions');
    }
  }

  /**
   * Archive a specific version
   * @param {string} attemptId - Generation attempt ID
   * @param {string} reason - Archive reason ('version_limit', 'manual', 'quality_score')
   * @returns {Promise<void>}
   */
  async archiveVersion(attemptId, reason) {
    try {
      await this.db.query(`
        UPDATE generation_attempts 
        SET archived = true, 
            archived_at = NOW(), 
            archive_reason = $1
        WHERE id = $2
      `, [reason, attemptId]);

      logger.info('Version archived', { attemptId, reason });
    } catch (error) {
      logger.error('Error archiving version', { error: error.message, attemptId, reason });
      throw error;
    }
  }

  /**
   * Restore an archived version
   * @param {string} attemptId - Generation attempt ID
   * @returns {Promise<void>}
   */
  async restoreVersion(attemptId) {
    try {
      // Check if restoring would exceed limit
      const attemptResult = await this.db.query(`
        SELECT order_id FROM generation_attempts WHERE id = $1
      `, [attemptId]);

      if (attemptResult.rows.length === 0) {
        throw new Error('Version not found');
      }

      const orderId = attemptResult.rows[0].order_id;
      const manageResult = await this.checkAndManageVersions(orderId);

      // Restore the version
      await this.db.query(`
        UPDATE generation_attempts 
        SET archived = false, 
            archived_at = NULL, 
            archive_reason = NULL,
            last_accessed_at = NOW()
        WHERE id = $1
      `, [attemptId]);

      logger.info('Version restored', { attemptId, orderId });

      return {
        restored: true,
        ...manageResult
      };
    } catch (error) {
      logger.error('Error restoring version', { error: error.message, attemptId });
      throw error;
    }
  }

  /**
   * Get all versions for an order (including archived)
   * @param {string} orderId - Order ID
   * @param {boolean} includeArchived - Whether to include archived versions
   * @returns {Promise<Object>} Versions and archive info
   */
  async getVersions(orderId, includeArchived = false) {
    try {
      const query = includeArchived 
        ? `SELECT *, 
             CASE WHEN archived THEN 
               EXTRACT(days FROM NOW() - archived_at)::INTEGER 
             ELSE NULL END as days_archived
           FROM generation_attempts 
           WHERE order_id = $1 AND status = 'completed'
           ORDER BY created_at DESC`
        : `SELECT * FROM generation_attempts 
           WHERE order_id = $1 AND archived = false AND status = 'completed'
           ORDER BY created_at DESC`;

      const result = await this.db.query(query, [orderId]);
      const versions = result.rows;

      // Update last_accessed_at for non-archived versions
      if (!includeArchived && versions.length > 0) {
        const versionIds = versions.map(v => v.id);
        await this.db.query(`
          UPDATE generation_attempts 
          SET last_accessed_at = NOW() 
          WHERE id = ANY($1::uuid[])
        `, [versionIds]);
      }

      // Get archive summary
      const archiveResult = await this.db.query(`
        SELECT COUNT(*) as archived_count,
               MIN(archived_at) as oldest_archived,
               MAX(archived_at) as newest_archived
        FROM generation_attempts 
        WHERE order_id = $1 AND archived = true
      `, [orderId]);

      const archiveInfo = archiveResult.rows[0];

      return {
        versions: versions.map(v => ({
          ...v,
          canRestore: v.archived && (v.days_archived || 0) < this.ARCHIVE_RETENTION_DAYS
        })),
        limits: {
          current: versions.filter(v => !v.archived).length,
          max: this.VERSION_SOFT_LIMIT,
          archived: parseInt(archiveInfo.archived_count) || 0
        },
        archiveInfo: {
          ...archiveInfo,
          retentionDays: this.ARCHIVE_RETENTION_DAYS
        }
      };
    } catch (error) {
      logger.error('Error getting versions', { error: error.message, orderId });
      throw new Error('Failed to get versions');
    }
  }

  /**
   * Cleanup old archived versions (called by cron job)
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldArchives() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.ARCHIVE_RETENTION_DAYS);

      const result = await this.db.query(`
        DELETE FROM generation_attempts 
        WHERE archived = true 
        AND archived_at < $1
        RETURNING id, order_id, attempt_number
      `, [cutoffDate]);

      const deletedVersions = result.rows;

      logger.info('Cleaned up old archived versions', { 
        count: deletedVersions.length,
        cutoffDate: cutoffDate.toISOString()
      });

      return {
        deletedCount: deletedVersions.length,
        deletedVersions
      };
    } catch (error) {
      logger.error('Error cleaning up archives', { error: error.message });
      throw error;
    }
  }

  /**
   * Get version statistics for admin dashboard
   * @returns {Promise<Object>} Version statistics
   */
  async getVersionStats() {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_versions,
          SUM(CASE WHEN archived = false THEN 1 ELSE 0 END) as active_versions,
          SUM(CASE WHEN archived = true THEN 1 ELSE 0 END) as archived_versions,
          COUNT(DISTINCT order_id) as orders_with_versions,
          AVG(CASE WHEN archived = false THEN model_quality_score ELSE NULL END) as avg_quality_score
        FROM generation_attempts 
        WHERE status = 'completed'
      `);

      const stats = result.rows[0];

      // Get version distribution
      const distributionResult = await this.db.query(`
        SELECT 
          COUNT(*) as count,
          CASE 
            WHEN version_count = 1 THEN '1'
            WHEN version_count <= 3 THEN '2-3'
            WHEN version_count <= 5 THEN '4-5'
            ELSE '6+'
          END as version_range
        FROM (
          SELECT order_id, COUNT(*) as version_count
          FROM generation_attempts 
          WHERE status = 'completed' AND archived = false
          GROUP BY order_id
        ) order_versions
        GROUP BY version_range
        ORDER BY version_range
      `);

      return {
        ...stats,
        distribution: distributionResult.rows,
        limits: {
          softLimit: this.VERSION_SOFT_LIMIT,
          retentionDays: this.ARCHIVE_RETENTION_DAYS
        }
      };
    } catch (error) {
      logger.error('Error getting version stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Archive versions based on quality score
   * @param {string} orderId - Order ID
   * @param {number} minQualityScore - Minimum quality score to keep (0-1)
   * @returns {Promise<Object>} Archive operation result
   */
  async archiveLowQualityVersions(orderId, minQualityScore = 0.3) {
    try {
      const result = await this.db.query(`
        UPDATE generation_attempts 
        SET archived = true, 
            archived_at = NOW(), 
            archive_reason = 'quality_score'
        WHERE order_id = $1 
        AND archived = false 
        AND selected = false
        AND model_quality_score < $2
        AND status = 'completed'
        RETURNING id, attempt_number, model_quality_score
      `, [orderId, minQualityScore]);

      const archivedVersions = result.rows;

      logger.info('Archived low quality versions', { 
        orderId, 
        count: archivedVersions.length,
        minQualityScore
      });

      return {
        archivedCount: archivedVersions.length,
        archivedVersions: archivedVersions.map(v => ({
          attemptNumber: v.attempt_number,
          qualityScore: v.model_quality_score
        }))
      };
    } catch (error) {
      logger.error('Error archiving low quality versions', { 
        error: error.message, 
        orderId, 
        minQualityScore 
      });
      throw error;
    }
  }
}