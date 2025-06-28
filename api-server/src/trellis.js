import { Client } from '@gradio/client';
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
    
    try {
      // Step 1: Validate image
      const validation = await this.validateImage(imageBuffer);
      if (!validation.isValid) {
        throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 2: Initialize client
      const client = await this.initClient();

      // Step 3: Start session
      logger.info('Starting TRELLIS session');
      await client.predict("/start_session", {});

      // Step 4: Prepare image for upload
      const imageFile = await this.createImageFile(imageBuffer);

      // Step 5: Preprocess images (background removal happens here)
      logger.info('Preprocessing images', { imageSize: imageBuffer.length });
      const preprocessResult = await client.predict("/preprocess_images", {
        images: [imageFile]
      });

      // Step 6: Get seed
      const seed = options.seed || 0;
      const randomizeSeed = !options.seed;
      const seedResult = await client.predict("/get_seed", {
        randomize_seed: randomizeSeed,
        seed: seed
      });

      const finalSeed = seedResult.data[0];
      logger.info('Generated seed', { finalSeed, randomized: randomizeSeed });

      // Step 7: Generate 3D model
      logger.info('Starting 3D generation via TRELLIS', { 
        seed: finalSeed,
        ssGuidanceStrength: options.ss_guidance_strength || 7.5,
        ssSamplingSteps: options.ss_sampling_steps || 12,
        slatGuidanceStrength: options.slat_guidance_strength || 3,
        slatSamplingSteps: options.slat_sampling_steps || 12
      });

      const generationResult = await client.predict("/image_to_3d", {
        multiimages: preprocessResult.data[0], // Use preprocessed images
        seed: finalSeed,
        ss_guidance_strength: options.ss_guidance_strength || 7.5,
        ss_sampling_steps: options.ss_sampling_steps || 12,
        slat_guidance_strength: options.slat_guidance_strength || 3,
        slat_sampling_steps: options.slat_sampling_steps || 12,
        multiimage_algo: options.multiimage_algo || "stochastic"
      });

      // Step 8: Extract GLB file
      logger.info('Extracting GLB file');
      const glbResult = await client.predict("/extract_glb", {
        mesh_simplify: options.mesh_simplify || 0.9,
        texture_size: options.texture_size || 512
      });

      const totalTime = Math.round((Date.now() - startTime) / 1000);
      
      // Extract GLB URL from result
      const glbUrl = glbResult.data[1]?.url || glbResult.data[0]?.url;
      
      logger.info('TRELLIS processing completed', {
        totalTimeSeconds: totalTime,
        glbUrl: glbUrl ? 'Generated' : 'Not found',
        seed: finalSeed
      });

      return {
        success: true,
        glbUrl,
        processingTimeSeconds: totalTime,
        backgroundRemovalConfidence: 0.9, // Assume good quality from preprocess
        modelQualityScore: 0.85, // Default quality score
        modelId: `trellis_${Date.now()}_${finalSeed}`,
        seed: finalSeed,
        rawGenerationResult: generationResult.data,
        rawGlbResult: glbResult.data
      };

    } catch (error) {
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      logger.error('TRELLIS processing failed', {
        error: error.message,
        totalTimeSeconds: totalTime,
        stack: error.stack
      });

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
    // Convert buffer to base64 data URL
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    
    return {
      image: {
        path: dataUrl,
        meta: { _type: "gradio.FileData" },
        orig_name: "furniture_image.jpg",
        url: dataUrl
      }
    };
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
    try {
      const client = await this.initClient();
      const imageFile = await this.createImageFile(imageBuffer);
      
      // Use the all-in-one endpoint that returns a direct URL
      const result = await client.predict("/generate_model_from_images_and_upload", {
        image_inputs: [imageFile],
        seed_val: options.seed || 0,
        ss_guidance_strength_val: options.ss_guidance_strength || 7.5,
        ss_sampling_steps_val: options.ss_sampling_steps || 12,
        slat_guidance_strength_val: options.slat_guidance_strength || 3,
        slat_sampling_steps_val: options.slat_sampling_steps || 12,
        multiimage_algo_val: options.multiimage_algo || "stochastic",
        mesh_simplify_val: options.mesh_simplify || 0.9,
        texture_size_val: options.texture_size || 512
      });
      
      // This should return a direct URL to the generated model
      const modelUrl = result.data[0];
      
      logger.info('Model generated and uploaded', { 
        modelUrl: modelUrl ? 'Generated' : 'Failed',
        options 
      });
      
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
}

export default TRELLISService;