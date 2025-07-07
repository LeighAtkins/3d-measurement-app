import { Client, handle_file } from '@gradio/client';
import sharp from 'sharp';
import logger from './logger.js';

export class TRELLISService {
  constructor() {
    this.spaceId = "Lemonator/multi-image-to-3d";
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.dailyGPULimit = 25 * 60; // 25 minutes in seconds
    this.avgProcessingTime = 48; // 48 seconds per model
    this.client = null; // Will be initialized when needed
  }

  /**
   * Initialize Gradio client connection
   */
  async initClient() {
    if (!this.client) {
      try {
        logger.info('Connecting to TRELLIS Gradio space', { spaceId: this.spaceId });
        
        const options = {};
        if (this.apiKey) {
          options.hf_token = this.apiKey;
        }
        
        this.client = await Client.connect(this.spaceId, options);
        logger.info('Successfully connected to TRELLIS space');
      } catch (error) {
        logger.error('Failed to connect to TRELLIS space', { 
          error: error.message,
          spaceId: this.spaceId
        });
        throw new Error(`Failed to connect to TRELLIS space: ${error.message}`);
      }
    }
    return this.client;
  }

  /**
   * Process furniture image through TRELLIS pipeline using official Gradio API
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processImage(imageBuffer, options = {}) {
    const startTime = Date.now();
    let imageFile = null;
    
    try {
      // Step 1: Validate image
      const validation = await this.validateImage(imageBuffer);
      if (!validation.isValid) {
        throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 2: Initialize client
      const client = await this.initClient();

      // Step 3: Create temporary file for TRELLIS processing
      const imageFilePath = await this.createImageFile(imageBuffer);
      imageFile = { path: imageFilePath }; // Store for cleanup
      
      logger.info('Using TRELLIS generation with temporary file', {
        tempFilePath: imageFilePath
      });

      // Use the all-in-one endpoint directly 
      const result = await this.generateModelFromImagesAndUpload(imageBuffer, options);
      
      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      const glbUrl = result.glbUrl;
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      
      logger.info('TRELLIS processing completed', {
        totalTimeSeconds: totalTime,
        glbUrl: glbUrl ? 'Generated' : 'Not found',
        seed: options.seed || 'random'
      });

      // Clean up temporary file
      await this.cleanupTempFile(imageFile.path);

      return {
        success: true,
        glbUrl,
        processingTimeSeconds: totalTime,
        backgroundRemovalConfidence: 0.9, // Assume good quality from preprocess
        modelQualityScore: 0.85, // Default quality score
        modelId: `trellis_${Date.now()}_${options.seed || 'random'}`,
        seed: options.seed || 0,
        rawGenerationResult: result.rawResult,
        rawGlbResult: result.rawResult
      };

    } catch (error) {
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      logger.error('TRELLIS processing failed', {
        error: error.message,
        totalTimeSeconds: totalTime,
        stack: error.stack
      });

      // Clean up temporary file even on error
      if (imageFile?.path) {
        await this.cleanupTempFile(imageFile.path);
      }

      return {
        success: false,
        error: error.message,
        processingTimeSeconds: totalTime
      };
    }
  }

  /**
   * Create a Gradio-compatible file object from image buffer
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Object} Gradio file object
   */
  async createImageFile(imageBuffer) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    // Create a temporary file with proper extension and shorter name
    const tempDir = os.tmpdir();
    const tempFileName = `img_${Date.now()}.jpg`; // Shorter filename
    const tempFilePath = path.join(tempDir, tempFileName);
    
    try {
      // Write buffer to temporary file
      await fs.writeFile(tempFilePath, imageBuffer);
      
      logger.info('Created temporary file for TRELLIS processing', { 
        tempFilePath,
        fileSize: imageBuffer.length 
      });

      // Return the file path directly - Gradio client will handle the upload
      return tempFilePath;
      
    } catch (error) {
      logger.error('Failed to create temporary file', { error: error.message });
      // If temp file creation fails, we need to throw an error instead of using data URL
      throw new Error(`Failed to create temporary file for TRELLIS processing: ${error.message}`);
    }
  }

  /**
   * Validate input image for furniture processing
   * @param {Buffer} imageBuffer - Image to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateImage(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const errors = [];

      // Check file size (max 10MB)
      if (imageBuffer.length > 10 * 1024 * 1024) {
        errors.push('Image file too large (max 10MB)');
      }

      // Check dimensions (min 512x512, max 4096x4096)
      if (metadata.width < 512 || metadata.height < 512) {
        errors.push('Image too small (minimum 512x512 pixels)');
      }
      
      if (metadata.width > 4096 || metadata.height > 4096) {
        errors.push('Image too large (maximum 4096x4096 pixels)');
      }

      // Check format
      if (!['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format)) {
        errors.push('Unsupported image format (use JPEG, PNG, or WebP)');
      }

      return {
        isValid: errors.length === 0,
        errors,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: imageBuffer.length
        }
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid or corrupted image file'],
        metadata: null
      };
    }
  }

  /**
   * Alternative method: Generate model from images and upload (all-in-one)
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Processing result with direct URL
   */
  async generateModelFromImagesAndUpload(imageBuffer, options = {}) {
    let imageFile = null;
    
    try {
      const client = await this.initClient();
      const imageFilePath = await this.createImageFile(imageBuffer);
      imageFile = { path: imageFilePath }; // Store for cleanup
      
      // Try the all-in-one endpoint that might be more lenient
      logger.info('Using generate_model_from_images_and_upload endpoint');
      
      // Use handle_file to properly upload the file to Gradio
      logger.info('Using handle_file for Gradio upload', { tempFile: imageFilePath });
      
      const fileData = handle_file(imageFilePath);
      
      const result = await client.predict("/generate_model_from_images_and_upload", {
        image_inputs: [fileData],  // Use handle_file for proper upload
        seed_val: options.seed || 0,
        ss_guidance_strength_val: options.ss_guidance_strength || 7.5,
        ss_sampling_steps_val: options.ss_sampling_steps || 12,
        slat_guidance_strength_val: options.slat_guidance_strength || 3,
        slat_sampling_steps_val: options.slat_sampling_steps || 12,
        multiimage_algo_val: "stochastic",
        mesh_simplify_val: options.mesh_simplify || 0.9,
        texture_size_val: options.texture_size || 512
      });
      
      // This should return a direct URL to the generated model
      const modelUrl = result.data[0];
      
      logger.info('Model generated and uploaded', { 
        modelUrl: modelUrl ? 'Generated' : 'Failed',
        options 
      });

      // Clean up temporary file
      await this.cleanupTempFile(imageFile.path);
      
      return {
        success: !!modelUrl,
        glbUrl: modelUrl,
        modelId: `trellis_upload_${Date.now()}`,
        rawResult: result.data
      };
      
    } catch (error) {
      logger.error('Generate and upload failed', { 
        error: error.message,
        stack: error.stack 
      });

      // Clean up temporary file even on error
      if (imageFile?.path) {
        await this.cleanupTempFile(imageFile.path);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if we can process more models today (GPU limit)
   * @returns {Promise<Object>} GPU availability status
   */
  async checkGPUAvailability() {
    try {
      // TODO: Implement actual GPU usage tracking from database
      const today = new Date().toISOString().split('T')[0];
      
      // Simulated GPU usage check
      const usedSeconds = 0; // TODO: Get from database
      const remainingSeconds = this.dailyGPULimit - usedSeconds;
      const canProcess = remainingSeconds >= this.avgProcessingTime;
      const maxModelsToday = Math.floor(this.dailyGPULimit / this.avgProcessingTime);
      const modelsProcessed = Math.floor(usedSeconds / this.avgProcessingTime);

      return {
        canProcess,
        remainingSeconds,
        maxModelsToday,
        modelsProcessed,
        resetTime: new Date(Date.now() + (24 * 60 * 60 * 1000)) // Tomorrow
      };

    } catch (error) {
      logger.error('GPU availability check failed', { error: error.message });
      return {
        canProcess: false,
        error: error.message
      };
    }
  }

  /**
   * Record GPU usage for tracking daily limits
   * @param {number} processingTimeSeconds - Time used for processing
   */
  async recordGPUUsage(processingTimeSeconds) {
    try {
      // TODO: Implement database recording
      logger.info('Recording GPU usage', { processingTimeSeconds });
      
      const today = new Date().toISOString().split('T')[0];
      
      // TODO: Update gpu_usage_log table
      // INSERT INTO gpu_usage_log (date, total_seconds_used, generation_count) 
      // VALUES (?, ?, ?) 
      // ON CONFLICT (date) DO UPDATE SET 
      //   total_seconds_used = total_seconds_used + ?,
      //   generation_count = generation_count + 1

    } catch (error) {
      logger.error('Failed to record GPU usage', { 
        error: error.message,
        processingTimeSeconds 
      });
    }
  }

  /**
   * Clean up temporary file
   * @param {string} filePath - Path to temporary file
   */
  async cleanupTempFile(filePath) {
    try {
      if (filePath && !filePath.startsWith('data:')) {
        const fs = await import('fs/promises');
        await fs.unlink(filePath);
        logger.info('Cleaned up temporary file', { filePath });
      }
    } catch (error) {
      // Don't throw errors for cleanup failures
      logger.warn('Failed to cleanup temporary file', { 
        filePath, 
        error: error.message 
      });
    }
  }

  /**
   * Process multiple furniture images through TRELLIS pipeline
   * This method takes the best/first image from the array and processes it
   * @param {Buffer[]} imageBuffers - Array of image buffers
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processImages(imageBuffers, options = {}) {
    if (!imageBuffers || imageBuffers.length === 0) {
      throw new Error('No image buffers provided');
    }

    logger.info('Processing multiple images with TRELLIS', {
      imageCount: imageBuffers.length,
      orderId: options.orderId
    });

    // For now, use the first image as the primary image
    // The TRELLIS "multi-image-to-3d" space should handle multiple images,
    // but our current implementation focuses on the best single image
    const primaryImageBuffer = imageBuffers[0];
    
    try {
      const result = await this.processImage(primaryImageBuffer, options);
      
      logger.info('Multi-image processing completed', {
        success: result.success,
        orderId: options.orderId,
        usedImageCount: 1,
        totalProvidedImages: imageBuffers.length
      });
      
      return result;
    } catch (error) {
      logger.error('Multi-image processing failed', {
        error: error.message,
        orderId: options.orderId,
        imageCount: imageBuffers.length
      });
      
      return {
        success: false,
        error: error.message,
        processingTimeSeconds: 0
      };
    }
  }
}

export default TRELLISService;