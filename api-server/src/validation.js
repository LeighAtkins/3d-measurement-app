import Joi from 'joi';
import logger from './logger.js';

// Validation schemas
export const schemas = {
  // Auth validation
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required()
  }),

  // Order validation
  createOrder: Joi.object({
    title: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    status: Joi.string().valid('PENDING', 'PENDING_MEASUREMENTS', 'COMPLETED', 'CANCELLED').default('PENDING'),
    model_url: Joi.string().uri().optional(),
    furniture_type: Joi.string().valid('sofa', 'armchair', 'cushion', 'ottoman', 'coffee-table').optional(),
    furniture_subcategory: Joi.string().max(50).optional(),
    assigned_client_id: Joi.string().uuid().optional()
  }),

  updateOrder: Joi.object({
    title: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    status: Joi.string().valid('PENDING', 'PENDING_MEASUREMENTS', 'COMPLETED', 'CANCELLED').optional(),
    model_url: Joi.string().uri().optional(),
    furniture_type: Joi.string().valid('sofa', 'armchair', 'cushion', 'ottoman', 'coffee-table').optional(),
    furniture_subcategory: Joi.string().max(50).optional(),
    assigned_client_id: Joi.string().uuid().optional()
  }),

  // Measurement validation
  createMeasurement: Joi.object({
    label: Joi.string().min(1).max(255).required(),
    value: Joi.number().positive().required(),
    unit: Joi.string().valid('cm', 'mm', 'm', 'in', 'ft').required(),
    start_point: Joi.object({
      x: Joi.number().required(),
      y: Joi.number().required(),
      z: Joi.number().required()
    }).required(),
    end_point: Joi.object({
      x: Joi.number().required(),
      y: Joi.number().required(),
      z: Joi.number().required()
    }).required(),
    notes: Joi.string().max(500).allow('').optional()
  }),

  updateMeasurement: Joi.object({
    label: Joi.string().min(1).max(255).optional(),
    value: Joi.number().positive().optional(),
    unit: Joi.string().valid('cm', 'mm', 'm', 'in', 'ft').optional(),
    start_point: Joi.object({
      x: Joi.number().required(),
      y: Joi.number().required(),
      z: Joi.number().required()
    }).optional(),
    end_point: Joi.object({
      x: Joi.number().required(),
      y: Joi.number().required(),
      z: Joi.number().required()
    }).optional(),
    notes: Joi.string().max(500).allow('').optional()
  }),

  // TRELLIS 3D Generation validation
  generate3D: Joi.object({
    orderId: Joi.string().uuid().required(),
    attempts: Joi.number().integer().min(1).max(3).default(1),
    guidanceStrength: Joi.number().min(1).max(20).default(7.5),
    samplingSteps: Joi.number().integer().min(20).max(100).default(50),
    seed: Joi.number().integer().min(0).optional()
  }),

  // Photo upload validation
  uploadPhotos: Joi.object({
    orderId: Joi.string().uuid().required(),
    furnitureType: Joi.string().valid('sofa', 'armchair', 'cushion', 'ottoman', 'coffee-table').required()
  }),

  // Photo analysis validation
  analyzePhotos: Joi.object({
    furnitureType: Joi.string().valid('sofa', 'armchair', 'cushion', 'ottoman', 'coffee-table').required()
  }),

  // Generation attempt selection
  selectBestAttempt: Joi.object({
    orderId: Joi.string().uuid().required(),
    selectedAttemptId: Joi.string().uuid().required()
  }),

  // UUID validation for params
  uuid: Joi.string().uuid().required()
};

// Validation middleware factory
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation failed', {
        endpoint: req.originalUrl,
        method: req.method,
        errors,
        user: req.user?.email || 'anonymous'
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace the property with the validated (and potentially transformed) value
    req[property] = value;
    next();
  };
};

// Specific validation middleware for common cases
export const validateUUID = (paramName) => {
  return (req, res, next) => {
    const { error } = schemas.uuid.validate(req.params[paramName]);
    
    if (error) {
      logger.warn('Invalid UUID parameter', {
        paramName,
        value: req.params[paramName],
        endpoint: req.originalUrl
      });
      
      return res.status(400).json({
        error: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};

// Rate limiting validation (basic implementation)
const requestCounts = new Map();

export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [key, timestamps] of requestCounts.entries()) {
      requestCounts.set(key, timestamps.filter(time => time > windowStart));
      if (requestCounts.get(key).length === 0) {
        requestCounts.delete(key);
      }
    }

    // Check current requests
    const currentRequests = requestCounts.get(identifier) || [];
    
    if (currentRequests.length >= maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip: identifier,
        requests: currentRequests.length,
        limit: maxRequests,
        endpoint: req.originalUrl
      });
      
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    currentRequests.push(now);
    requestCounts.set(identifier, currentRequests);
    
    next();
  };
};