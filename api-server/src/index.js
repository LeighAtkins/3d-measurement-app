// This is an ES module
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load environment variables from root .env file
config({ path: join(__dirname, '../../.env') });

console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('Loading .env from:', join(__dirname, '../../.env'));
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger, { requestLogger, errorLogger } from './logger.js';
import { validate, validateUUID, rateLimit, schemas } from './validation.js';
import meshy from './meshy.js';
import r2 from './r2.js';
import TRELLISService from './trellis.js';
import multer from 'multer';
// Fallback to in-memory data when database is not available
let useDatabase = true;
let db;

import dbTest from './routes/db-test.js';
try {
  db = (await import('./db.js')).default || (await import('./db.js'));
} catch (error) {
  logger.warn('Database not available, falling back to in-memory store', { error: error?.message });
  useDatabase = false;
}

// In-memory data store for fallback
const users = [
  {
    id: '1',
    email: 'admin@acme.com',
    password: '$2a$10$QM9eHpG3GwHhOFP9nLvAIuTS4YXUWNWBWEq9Lneayoc74J/BD5fyC', // password: admin123
    role: 'COMPANY_ADMIN',
    company: {
      subdomain: 'acme',
      name: 'Acme Corp'
    }
  },
  {
    id: '2',
    email: 'client1@example.com',
    password: '$2a$10$Qb9OR8X8w5eMzK3RFLS5E.no7eTzFmHPd5R7CZJM6orqHc/0mFHge', // password: client123
    role: 'CLIENT'
  }
];

const orders = [
  {
    id: '1',
    title: 'Kitchen Cabinet Measurement',
    description: 'Measure kitchen cabinet dimensions for renovation',
    status: 'PENDING_MEASUREMENTS',
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-16').toISOString(),
    modelUrl: '/sample-models/cabinet.glb',
    assignedClient: {
      id: '2',
      email: 'client1@example.com'
    },
    companyId: '1'
  },
  {
    id: '2',
    title: 'Room Dimensions Survey',
    description: 'Complete room measurement for space planning',
    status: 'PENDING',
    createdAt: new Date('2024-01-10').toISOString(),
    updatedAt: new Date('2024-01-10').toISOString(),
    modelUrl: '/sample-models/room.glb',
    companyId: '1'
  }
];

const measurements = [
  {
    id: '1',
    orderId: '1',
    label: 'Cabinet Width',
    value: 120,
    unit: 'cm',
    startPoint: { x: -0.5, y: 0, z: 0.5 },
    endPoint: { x: 0.5, y: 0, z: 0.5 },
    notes: 'Main cabinet width',
    createdBy: {
      email: 'client1@example.com',
      role: 'CLIENT'
    },
    createdAt: new Date('2024-01-16').toISOString()
  },
  {
    id: '2',
    orderId: '1',
    label: 'Cabinet Height',
    value: 80,
    unit: 'cm',
    startPoint: { x: 0.5, y: -0.5, z: 0.5 },
    endPoint: { x: 0.5, y: 0.5, z: 0.5 },
    notes: 'From floor to top',
    createdBy: {
      email: 'client1@example.com',
      role: 'CLIENT'
    },
    createdAt: new Date('2024-01-16').toISOString()
  }
];

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-mvp';

app.use((req, res, next) => {
  const hostname = req.headers.host.split(':')[0];
  const parts = hostname.split('.');
  if (parts.length > 2) {
    req.subdomain = parts[0];
  }
  next();
});

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Initialize TRELLIS service
const trellisService = new TRELLISService();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for 3D models
app.use(requestLogger); // Add request logging
app.use(rateLimit()); // Basic rate limiting
app.use('/api', dbTest);


// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    await db.query(`SET LOCAL request.jwt.claims = '${JSON.stringify(decoded)}'`);

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// Auth
app.post('/api/auth/login', validate(schemas.login), async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    const { email, password } = req.body;
    let user;

    if (useDatabase) {
      const result = await db.query(`
        SELECT u.*, c.name as company_name, c.subdomain as company_subdomain 
        FROM users u 
        LEFT JOIN companies c ON u.company_id = c.id 
        WHERE u.email = $1
      `, [email]);
      
      user = result.rows[0];
      
      // Format user object to match expected structure
      if (user && user.company_subdomain) {
        user.company = {
          name: user.company_name,
          subdomain: user.company_subdomain
        };
      }
    } else {
      user = users.find(u => u.email === email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordField = useDatabase ? user.password_hash : user.password;
    const isValidPassword = await bcrypt.compare(password, passwordField);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        company: user.company,
        company_id: user.company_id,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      JWT_SECRET
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        company: user.company
      }
    });
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// Orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    let query;
    const params = [];

    if (req.user.role === 'CLIENT') {
      query = 'SELECT o.*, (SELECT COUNT(*) FROM measurements m WHERE m.order_id = o.id) as "measurementCount" FROM orders o WHERE o.assigned_client_id = $1';
      params.push(req.user.sub);
    } else if (req.user.role.startsWith('COMPANY_')) {
      query = 'SELECT o.*, (SELECT COUNT(*) FROM measurements m WHERE m.order_id = o.id) as "measurementCount" FROM orders o WHERE o.company_id = $1';
      params.push(req.user.company_id);
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    const result = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    const order = result.rows[0];

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'CLIENT' && order.assigned_client_id !== req.user.sub) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders', authenticateToken, validate(schemas.createOrder), async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    if (!req.user.role.startsWith('COMPANY_')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, description, status, model_url, assigned_client_id } = req.body;
    const result = await db.query(
      'INSERT INTO orders (title, description, status, model_url, company_id, assigned_client_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, status, model_url, req.user.company_id, assigned_client_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/orders/:id', authenticateToken, validateUUID('id'), validate(schemas.updateOrder), async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    const { title, description, status, model_url, assigned_client_id } = req.body;
    const result = await db.query(
      'UPDATE orders SET title = $1, description = $2, status = $3, model_url = $4, assigned_client_id = $5, updated_at = NOW() WHERE id = $6 AND company_id = $7 RETURNING *',
      [title, description, status, model_url, assigned_client_id, req.params.id, req.user.company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or access denied' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// Measurements
app.get('/api/orders/:orderId/measurements', authenticateToken, async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.orderId]);
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'CLIENT' && order.assigned_client_id !== req.user.sub) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const measurementsResult = await db.query('SELECT * FROM measurements WHERE order_id = $1', [req.params.orderId]);
    res.json(measurementsResult.rows);
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders/:orderId/measurements', authenticateToken, validateUUID('orderId'), validate(schemas.createMeasurement), async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [req.params.orderId]);
    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'CLIENT' && order.assigned_client_id !== req.user.sub) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { label, value, unit, start_point, end_point, notes } = req.body;
    const result = await db.query(
      'INSERT INTO measurements (order_id, label, value, unit, start_point, end_point, notes, created_by_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.params.orderId, label, value, unit, start_point, end_point, notes, req.user.sub]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/orders/:orderId/measurements/:id', authenticateToken, validateUUID('orderId'), validateUUID('id'), validate(schemas.updateMeasurement), async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    const { label, value, unit, start_point, end_point, notes } = req.body;
    const result = await db.query(
      'UPDATE measurements SET label = $1, value = $2, unit = $3, start_point = $4, end_point = $5, notes = $6, updated_at = NOW() WHERE id = $7 AND order_id = $8 RETURNING *',
      [label, value, unit, start_point, end_point, notes, req.params.id, req.params.orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Measurement not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/orders/:orderId/measurements/:id', authenticateToken, async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    const result = await db.query('DELETE FROM measurements WHERE id = $1 AND order_id = $2', [req.params.id, req.params.orderId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Measurement not found' });
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders/:id/generate-model', authenticateToken, validateUUID('id'), validate(schemas.generate3D), async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    const { prompt } = req.body;
    const orderId = req.params.id;

    const taskId = await meshy.createTextTo3DTask(prompt);

    const interval = setInterval(async () => {
      const task = await meshy.getTaskResult(taskId);

      if (task.status === 'SUCCEEDED') {
        clearInterval(interval);
        const modelUrl = task.model_url;
        await db.query('UPDATE orders SET model_url = $1 WHERE id = $2', [modelUrl, orderId]);
      } else if (task.status === 'FAILED') {
        clearInterval(interval);
      }
    }, 5000);

    res.json({ taskId });
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders/:id/upload-model', authenticateToken, r2.upload.single('model'), async (req, res) => {
  try {
  db = (await import('./db.js')).default || (await import('./db.js'));
    const orderId = req.params.id;
    const modelKey = await r2.uploadFile(req.file);
    const modelUrl = await r2.getSignedUrl(modelKey);

    await db.query('UPDATE orders SET model_url = $1 WHERE id = $2', [modelUrl, orderId]);

    res.json({ modelUrl });
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// TRELLIS 3D Generation Endpoints

// Upload photos for furniture order
app.post('/api/furniture/upload-photos/:orderId', 
  authenticateToken, 
  validateUUID('orderId'), 
  upload.array('photos', 5),
  async (req, res) => {
    try {
      db = (await import('./db.js')).default || (await import('./db.js'));
      const { orderId } = req.params;
      const { furnitureType } = req.body;
      
      // Verify order exists and user has access
      const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      const order = orderResult.rows[0];
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No photos uploaded' });
      }
      
      // Validate and store photos
      const uploadedPhotos = [];
      for (const file of req.files) {
        const validation = await trellisService.validateImage(file.buffer);
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: `Invalid photo "${file.originalname}": ${validation.errors.join(', ')}` 
          });
        }
        
        // For now, store the file buffer as base64 in the file_path field
        // In production, you'd save to disk or cloud storage
        const base64Data = file.buffer.toString('base64');
        const photoResult = await db.query(`
          INSERT INTO order_photos (order_id, filename, file_path, file_size, mime_type, uploaded_by_id)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [orderId, file.originalname, `data:${file.mimetype};base64,${base64Data}`, file.size, file.mimetype, req.user.sub]);
        
        uploadedPhotos.push(photoResult.rows[0]);
      }
      
      // Update order with furniture type
      await db.query(`
        UPDATE orders SET furniture_type = $1, generation_status = 'photos_uploaded'
        WHERE id = $2
      `, [furnitureType, orderId]);
      
      logger.info('Photos uploaded successfully', {
        orderId,
        photoCount: uploadedPhotos.length,
        furnitureType,
        user: req.user.email
      });
      
      res.json({
        success: true,
        message: `${uploadedPhotos.length} photos uploaded successfully`,
        photos: uploadedPhotos,
        nextStep: 'Ready for 3D generation'
      });
      
    } catch (error) {
      logger.error('Photo upload failed', { 
        error: error.message, 
        orderId: req.params.orderId,
        user: req.user?.email 
      });
      res.status(500).json({ error: 'Photo upload failed' });
    }
  }
);

// Generate 3D model from uploaded photos
app.post('/api/furniture/generate-3d', 
  authenticateToken, 
  validate(schemas.generate3D),
  async (req, res) => {
    try {
      db = (await import('./db.js')).default || (await import('./db.js'));
      const { orderId, attempts = 1, guidanceStrength, samplingSteps, seed } = req.body;
      
      // Check GPU availability
      const gpuStatus = await trellisService.checkGPUAvailability();
      if (!gpuStatus.canProcess) {
        return res.status(429).json({
          error: 'Daily GPU limit reached',
          details: gpuStatus,
          retryAfter: '24 hours'
        });
      }
      
      // Get order and photos
      const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      const order = orderResult.rows[0];
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const photosResult = await db.query(`
        SELECT * FROM order_photos WHERE order_id = $1 ORDER BY created_at
      `, [orderId]);
      
      if (photosResult.rows.length === 0) {
        return res.status(400).json({ error: 'No photos found for this order' });
      }
      
      // Update order status
      await db.query(`
        UPDATE orders SET generation_status = 'generating', generation_attempts = generation_attempts + 1
        WHERE id = $1
      `, [orderId]);
      
      // Start async generation process
      const generateAsync = async () => {
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            // Create generation attempt record
            const attemptResult = await db.query(`
              INSERT INTO generation_attempts (order_id, attempt_number, seed_value, status)
              VALUES ($1, $2, $3, 'processing') RETURNING id
            `, [orderId, attempt, seed]);
            
            const attemptId = attemptResult.rows[0].id;
            
            // Use first photo for now (TODO: combine multiple photos)
            const primaryPhoto = photosResult.rows[0];
            // Extract buffer from base64 data URL
            const base64Data = primaryPhoto.file_path.split(',')[1];
            const photoBuffer = Buffer.from(base64Data, 'base64');
            
            // Process with TRELLIS
            const result = await trellisService.processImage(photoBuffer, {
              seed: seed || Math.floor(Math.random() * 1000000),
              guidanceStrength,
              samplingSteps
            });
            
            // Update attempt with results
            await db.query(`
              UPDATE generation_attempts SET 
                status = $1,
                background_removal_confidence = $2,
                model_quality_score = $3,
                processing_time_seconds = $4,
                glb_url = $5,
                error_message = $6,
                selected = $7
              WHERE id = $8
            `, [
              result.success ? 'completed' : 'failed',
              result.backgroundRemovalConfidence,
              result.modelQualityScore,
              result.processingTimeSeconds,
              result.glbUrl,
              result.error,
              attempt === 1, // Select first successful attempt by default
              attemptId
            ]);
            
            // Record GPU usage
            if (result.processingTimeSeconds) {
              await trellisService.recordGPUUsage(result.processingTimeSeconds);
            }
            
            if (result.success && attempt === 1) {
              // Update order with first successful model
              await db.query(`
                UPDATE orders SET 
                  model_url = $1, 
                  generation_status = 'completed'
                WHERE id = $2
              `, [result.glbUrl, orderId]);
            }
            
          } catch (error) {
            logger.error('Generation attempt failed', {
              orderId,
              attempt,
              error: error.message
            });
            
            // Update attempt with error
            await db.query(`
              UPDATE generation_attempts SET 
                status = 'failed',
                error_message = $1
              WHERE order_id = $2 AND attempt_number = $3
            `, [error.message, orderId, attempt]);
          }
        }
        
        // Final status update
        const completedAttempts = await db.query(`
          SELECT COUNT(*) as count FROM generation_attempts 
          WHERE order_id = $1 AND status = 'completed'
        `, [orderId]);
        
        if (completedAttempts.rows[0].count > 0) {
          await db.query(`
            UPDATE orders SET generation_status = 'completed' WHERE id = $1
          `, [orderId]);
        } else {
          await db.query(`
            UPDATE orders SET generation_status = 'failed' WHERE id = $1
          `, [orderId]);
        }
      };
      
      // Start generation in background
      generateAsync().catch(error => {
        logger.error('Background generation failed', { orderId, error: error.message });
      });
      
      // Return immediate response
      res.json({
        success: true,
        message: '3D generation started',
        orderId,
        estimatedTime: 48 * attempts,
        attempts,
        status: 'processing'
      });
      
    } catch (error) {
      logger.error('3D generation request failed', { 
        error: error.message,
        orderId: req.body.orderId,
        user: req.user?.email
      });
      res.status(500).json({ error: '3D generation failed' });
    }
  }
);

// Get measurement template for furniture type
app.get('/api/furniture/measurement-template/:type', 
  authenticateToken,
  async (req, res) => {
    try {
      db = (await import('./db.js')).default || (await import('./db.js'));
      const { type } = req.params;
      
      const result = await db.query(`
        SELECT * FROM measurement_templates 
        WHERE furniture_type = $1 
        ORDER BY display_order, measurement_name
      `, [type]);
      
      res.json({
        furnitureType: type,
        measurements: result.rows
      });
      
    } catch (error) {
      logger.error('Failed to get measurement template', { 
        error: error.message,
        furnitureType: req.params.type
      });
      res.status(500).json({ error: 'Failed to get measurement template' });
    }
  }
);

// Select best generation attempt
app.post('/api/generation/select-best', 
  authenticateToken,
  validate(schemas.selectBestAttempt),
  async (req, res) => {
    try {
      db = (await import('./db.js')).default || (await import('./db.js'));
      const { orderId, selectedAttemptId } = req.body;
      
      // Verify access to order
      const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      const order = orderResult.rows[0];
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get the selected attempt
      const attemptResult = await db.query(`
        SELECT * FROM generation_attempts WHERE id = $1 AND order_id = $2
      `, [selectedAttemptId, orderId]);
      
      if (attemptResult.rows.length === 0) {
        return res.status(404).json({ error: 'Generation attempt not found' });
      }
      
      const selectedAttempt = attemptResult.rows[0];
      
      // Unselect all attempts for this order
      await db.query(`
        UPDATE generation_attempts SET selected = false WHERE order_id = $1
      `, [orderId]);
      
      // Select the chosen attempt
      await db.query(`
        UPDATE generation_attempts SET selected = true WHERE id = $1
      `, [selectedAttemptId]);
      
      // Update order with selected model
      await db.query(`
        UPDATE orders SET model_url = $1 WHERE id = $2
      `, [selectedAttempt.glb_url, orderId]);
      
      logger.info('Best generation attempt selected', {
        orderId,
        selectedAttemptId,
        user: req.user.email
      });
      
      res.json({
        success: true,
        message: 'Best attempt selected successfully',
        selectedAttempt: selectedAttempt
      });
      
    } catch (error) {
      logger.error('Failed to select best attempt', {
        error: error.message,
        orderId: req.body.orderId,
        user: req.user?.email
      });
      res.status(500).json({ error: 'Failed to select best attempt' });
    }
  }
);

// Health check
app.get('/health', (req, res) => res.send('OK'));
app.use('/api', dbTest);

// Error handling middleware (must be last)
app.use(errorLogger);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 API Server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    database: useDatabase ? 'PostgreSQL' : 'In-Memory'
  });
});