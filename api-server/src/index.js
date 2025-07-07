// This is an ES module - Updated with TRELLIS fixes and photo set response fix
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
import { GPUQuotaService } from './gpuQuotaService.js';
import { VersionService } from './versionService.js';
import versionRoutes, { checkVersionLimits } from './routes/versions.js';
import multer from 'multer';
// Fallback to in-memory data when database is not available
let useDatabase = true;
let db;
let gpuQuotaService;
let versionService;

import dbTest from './routes/db-test.js';
try {
  const dbModule = await import('./db.js');
  db = dbModule.default || dbModule;
  logger.info('Database module loaded successfully');
  
  // Initialize GPU quota service
  gpuQuotaService = new GPUQuotaService(db);
  logger.info('GPU quota service initialized');
  
  // Initialize version service
  versionService = new VersionService(db);
  logger.info('Version service initialized');
} catch (error) {
  logger.warn('Database not available, falling back to in-memory store', { error: error?.message });
  useDatabase = false;
}

// In-memory data store for fallback
const users = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@acme.com',
    password: '$2a$10$QM9eHpG3GwHhOFP9nLvAIuTS4YXUWNWBWEq9Lneayoc74J/BD5fyC', // password: admin123
    role: 'COMPANY_ADMIN',
    company_id: '733d2936-521b-402b-b0ef-97f29c2326af',
    company: {
      subdomain: 'acme',
      name: 'Acme Corp'
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'client1@example.com',
    password: '$2a$10$Qb9OR8X8w5eMzK3RFLS5E.no7eTzFmHPd5R7CZJM6orqHc/0mFHge', // password: client123
    role: 'CLIENT',
    company_id: null
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'client2@example.com',
    password: '$2a$10$Qb9OR8X8w5eMzK3RFLS5E.no7eTzFmHPd5R7CZJM6orqHc/0mFHge', // password: client123
    role: 'CLIENT',
    company_id: null
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    email: 'client3@example.com',
    password: '$2a$10$Qb9OR8X8w5eMzK3RFLS5E.no7eTzFmHPd5R7CZJM6orqHc/0mFHge', // password: client123
    role: 'CLIENT',
    company_id: null
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
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to transform external model URLs to proxy URLs
function transformModelUrl(modelUrl, baseUrl = 'http://localhost:8000') {
  if (!modelUrl) return modelUrl;
  
  // Check if it's an external URL that needs proxying
  const externalDomains = [
    'viverse-backend.onrender.com',
    'huggingface.co',
    'hf.co'
  ];
  
  try {
    const urlObj = new URL(modelUrl);
    if (externalDomains.includes(urlObj.hostname)) {
      // Transform to proxy URL
      return `${baseUrl}/api/models/proxy?url=${encodeURIComponent(modelUrl)}`;
    }
  } catch (error) {
    // If URL parsing fails, return original
    logger.warn('Failed to parse model URL', { modelUrl, error: error.message });
  }
  
  return modelUrl;
}

// Helper function to transform order data
function transformOrderData(order, req) {
  if (!order) return order;
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return {
    ...order,
    model_url: transformModelUrl(order.model_url, baseUrl)
  };
}

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

// Initialize services
const trellisService = new TRELLISService();

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Increase limit for 3D models
app.use(requestLogger); // Add request logging
app.use(rateLimit()); // Basic rate limiting
app.use('/api', dbTest);

// Make database and services available to routes
app.locals.db = db;
app.locals.gpuQuotaService = gpuQuotaService;

// Add version management routes
app.use('/api', versionRoutes);


// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Only set JWT claims if using database and RLS is enabled
    if (useDatabase && db) {
      try {
        await db.query(`SET LOCAL request.jwt.claims = '${JSON.stringify(decoded)}'`);
      } catch (dbError) {
        // Log but don't fail request if setting claims fails
        logger.warn('Failed to set JWT claims', { error: dbError.message });
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// Auth
app.post('/api/auth/login', validate(schemas.login), async (req, res) => {
  try {
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
    const transformedOrders = result.rows.map(order => transformOrderData(order, req));
    res.json(transformedOrders);
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
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

    res.json(transformOrderData(order, req));
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// Model proxy endpoint to bypass CORS for external 3D models
app.get('/api/models/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    // Validate that it's a GLB/GLTF model URL
    if (!url.match(/\.(glb|gltf)(\?.*)?$/i)) {
      return res.status(400).json({ error: 'Only GLB and GLTF models are supported' });
    }
    
    // Only allow specific domains for security
    const allowedDomains = [
      'viverse-backend.onrender.com',
      'huggingface.co',
      'hf.co'
    ];
    
    const urlObj = new URL(url);
    if (!allowedDomains.includes(urlObj.hostname)) {
      return res.status(400).json({ error: 'Domain not allowed' });
    }
    
    logger.info('Proxying 3D model request', { url });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.error('Failed to fetch model', { url, status: response.status });
      return res.status(response.status).json({ error: 'Failed to fetch model' });
    }
    
    // Get the model data as buffer
    const modelBuffer = await response.arrayBuffer();
    
    // Set appropriate headers for GLB files
    res.set({
      'Content-Type': 'model/gltf-binary',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': modelBuffer.byteLength.toString(),
      'Content-Disposition': 'inline; filename="model.glb"'
    });
    
    // Send the model data
    res.send(Buffer.from(modelBuffer));
    
  } catch (error) {
    logger.error('Model proxy error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Proxy error' });
  }
});

// Direct model serving endpoint for orders (public access for 3D viewer)
app.get('/api/orders/:id/model', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the order with model URL
    const result = await db.query('SELECT model_url FROM orders WHERE id = $1', [id]);
    const order = result.rows[0];
    
    if (!order || !order.model_url) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    logger.info('Serving model for order', { orderId: id, modelUrl: order.model_url });
    
    // Fetch the model from external URL
    const response = await fetch(order.model_url);
    
    if (!response.ok) {
      logger.error('Failed to fetch model', { modelUrl: order.model_url, status: response.status });
      return res.status(response.status).json({ error: 'Failed to fetch model' });
    }
    
    // Get the model data as buffer
    const modelBuffer = await response.arrayBuffer();
    
    // Set appropriate headers for GLB files
    res.set({
      'Content-Type': 'model/gltf-binary',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': modelBuffer.byteLength.toString(),
      'Content-Disposition': 'inline; filename="model.glb"'
    });
    
    // Send the model data
    res.send(Buffer.from(modelBuffer));
    
  } catch (error) {
    logger.error('Model serving error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Model serving error' });
  }
});

app.post('/api/orders', authenticateToken, validate(schemas.createOrder), async (req, res) => {
  try {
    if (!req.user.role.startsWith('COMPANY_')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, description, status, model_url, assigned_client_id } = req.body;
    const result = await db.query(
      'INSERT INTO orders (title, description, status, model_url, company_id, assigned_client_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, status, model_url, req.user.company_id, assigned_client_id]
    );

    res.status(201).json(transformOrderData(result.rows[0], req));
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/orders/:id', authenticateToken, validateUUID('id'), validate(schemas.updateOrder), async (req, res) => {
  try {
    const { title, description, status, model_url, assigned_client_id } = req.body;
    
    // Build dynamic update query with only provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (model_url !== undefined) {
      updates.push(`model_url = $${paramCount++}`);
      values.push(model_url);
    }
    if (assigned_client_id !== undefined) {
      updates.push(`assigned_client_id = $${paramCount++}`);
      values.push(assigned_client_id);
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(req.params.id, req.user.company_id);
    
    const result = await db.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramCount++} AND company_id = $${paramCount++} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or access denied' });
    }

    res.json(transformOrderData(result.rows[0], req));
  } catch (error) {
    logger.error('Error in endpoint', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
});

// Measurements
app.get('/api/orders/:orderId/measurements', authenticateToken, async (req, res) => {
  try {
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
        photoCount: uploadedPhotos.length,
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

// Add more photos to an existing order
app.post('/api/orders/:orderId/photos', 
  authenticateToken, 
  validateUUID('orderId'), 
  upload.array('photos', 5),
  async (req, res) => {
    try {
      const { orderId } = req.params;
      
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
        return res.status(400).json({ error: 'No photos provided' });
      }

      // Check total photo limit (20 photos per order)
      const existingPhotosResult = await db.query('SELECT COUNT(*) as count FROM order_photos WHERE order_id = $1', [orderId]);
      const existingCount = parseInt(existingPhotosResult.rows[0].count);
      
      if (existingCount + req.files.length > 20) {
        return res.status(400).json({ 
          error: `Photo limit exceeded. You can have a maximum of 20 photos per order. Currently have ${existingCount}, trying to add ${req.files.length}.` 
        });
      }
      
      // Validate and store new photos
      const uploadedPhotos = [];
      for (const file of req.files) {
        const validation = await trellisService.validateImage(file.buffer);
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: `Invalid photo "${file.originalname}": ${validation.errors.join(', ')}` 
          });
        }
        
        const base64Data = file.buffer.toString('base64');
        const photoResult = await db.query(`
          INSERT INTO order_photos (order_id, filename, file_path, file_size, mime_type, uploaded_by_id)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [orderId, file.originalname, `data:${file.mimetype};base64,${base64Data}`, file.size, file.mimetype, req.user.sub]);
        
        uploadedPhotos.push(photoResult.rows[0]);
      }
      
      logger.info('Additional photos uploaded', {
        orderId,
        newPhotoCount: uploadedPhotos.length,
        totalPhotos: existingCount + uploadedPhotos.length,
        user: req.user.email
      });
      
      res.json({
        success: true,
        message: `${uploadedPhotos.length} photos added successfully`,
        photos: uploadedPhotos,
        totalPhotos: existingCount + uploadedPhotos.length
      });
      
    } catch (error) {
      logger.error('Additional photo upload failed', { 
        error: error.message, 
        orderId: req.params.orderId,
        user: req.user?.email 
      });
      res.status(500).json({ error: 'Photo upload failed' });
    }
  }
);

// Model proxy endpoint to bypass CORS restrictions
app.get('/api/models/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate the URL is from an allowed domain
    const allowedDomains = [
      'viverse-backend.onrender.com',
      'huggingface.co',
      'hf.co'
    ];
    
    const urlObj = new URL(url);
    if (!allowedDomains.includes(urlObj.hostname)) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    // Only allow GLB and GLTF files
    if (!/\.(glb|gltf)$/i.test(urlObj.pathname)) {
      return res.status(400).json({ error: 'Only GLB and GLTF models are supported' });
    }

    logger.info('Proxying model request', { 
      originalUrl: url,
      domain: urlObj.hostname 
    });

    // Fetch the model from the external service
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.error('Failed to fetch external model', { 
        url, 
        status: response.status, 
        statusText: response.statusText 
      });
      return res.status(response.status).json({ 
        error: `Failed to fetch model: ${response.statusText}` 
      });
    }

    // Set appropriate headers for 3D model serving
    res.set({
      'Content-Type': 'model/gltf-binary',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

    // Stream the model data to the client
    response.body.pipe(res);

  } catch (error) {
    logger.error('Model proxy error', { 
      error: error.message, 
      url: req.query.url 
    });
    res.status(500).json({ error: 'Failed to proxy model' });
  }
});

// Delete a specific photo
app.delete('/api/photos/:photoId', authenticateToken, validateUUID('photoId'), async (req, res) => {
  try {
    const { photoId } = req.params;
    
    // Get photo details and verify access
    const photoResult = await db.query(`
      SELECT op.*, o.company_id 
      FROM order_photos op 
      JOIN orders o ON op.order_id = o.id 
      WHERE op.id = $1
    `, [photoId]);
    
    const photo = photoResult.rows[0];
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Check permissions
    if (req.user.role.startsWith('COMPANY_') && photo.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete the photo
    await db.query('DELETE FROM order_photos WHERE id = $1', [photoId]);
    
    logger.info('Photo deleted', {
      photoId,
      orderId: photo.order_id,
      filename: photo.filename,
      user: req.user.email
    });
    
    res.json({ success: true, message: 'Photo deleted successfully' });
    
  } catch (error) {
    logger.error('Photo deletion failed', { 
      error: error.message, 
      photoId: req.params.photoId,
      user: req.user?.email 
    });
    res.status(500).json({ error: 'Photo deletion failed' });
  }
});

// Photo Set Management Endpoints

// Get all photo sets for an order
app.get('/api/orders/:orderId/photo-sets', authenticateToken, validateUUID('orderId'), async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Verify order access
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (req.user.role === 'CLIENT' && order.assigned_client_id !== req.user.sub) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get photo sets with photo counts
    const photoSetsResult = await db.query(`
      SELECT 
        ps.*,
        COUNT(op.id) as photo_count,
        ARRAY_AGG(op.id ORDER BY op.created_at) FILTER (WHERE op.id IS NOT NULL) as photo_ids
      FROM photo_sets ps
      LEFT JOIN order_photos op ON ps.id = op.photo_set_id
      WHERE ps.order_id = $1
      GROUP BY ps.id
      ORDER BY ps.created_at DESC
    `, [orderId]);
    
    res.json(photoSetsResult.rows);
  } catch (error) {
    logger.error('Error getting photo sets', { error: error.message, orderId: req.params.orderId });
    res.status(500).json({ error: 'Failed to get photo sets' });
  }
});

// Create new photo set with selected photos
app.post('/api/orders/:orderId/photo-sets', authenticateToken, validateUUID('orderId'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { name, photoIds } = req.body;
    
    // Verify order access
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Create photo set
    const photoSetResult = await db.query(`
      INSERT INTO photo_sets (order_id, name, photo_count)
      VALUES ($1, $2, $3) RETURNING *
    `, [orderId, name, photoIds.length]);
    
    const photoSet = photoSetResult.rows[0];
    
    // Update photos to belong to this set
    if (photoIds && photoIds.length > 0) {
      await db.query(`
        UPDATE order_photos 
        SET photo_set_id = $1 
        WHERE id = ANY($2) AND order_id = $3
      `, [photoSet.id, photoIds, orderId]);
    }
    
    logger.info('Photo set created', {
      photoSetId: photoSet.id,
      orderId,
      photoCount: photoIds.length,
      user: req.user.email
    });
    
    res.status(201).json(photoSet);
  } catch (error) {
    logger.error('Error creating photo set', { error: error.message, orderId: req.params.orderId });
    res.status(500).json({ error: 'Failed to create photo set' });
  }
});

// Update photos in a photo set
app.put('/api/photo-sets/:photoSetId/photos', authenticateToken, validateUUID('photoSetId'), async (req, res) => {
  try {
    const { photoSetId } = req.params;
    const { photoIds } = req.body;
    
    // Get photo set and verify access
    const photoSetResult = await db.query(`
      SELECT ps.*, o.company_id, o.assigned_client_id 
      FROM photo_sets ps 
      JOIN orders o ON ps.order_id = o.id 
      WHERE ps.id = $1
    `, [photoSetId]);
    
    const photoSet = photoSetResult.rows[0];
    if (!photoSet) {
      return res.status(404).json({ error: 'Photo set not found' });
    }
    
    if (req.user.role === 'CLIENT' && photoSet.assigned_client_id !== req.user.sub) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role.startsWith('COMPANY_') && photoSet.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Clear existing photo set assignments for this set
    await db.query('UPDATE order_photos SET photo_set_id = NULL WHERE photo_set_id = $1', [photoSetId]);
    
    // Assign new photos to the set
    if (photoIds && photoIds.length > 0) {
      await db.query(`
        UPDATE order_photos 
        SET photo_set_id = $1 
        WHERE id = ANY($2) AND order_id = $3
      `, [photoSetId, photoIds, photoSet.order_id]);
    }
    
    // Update photo count
    await db.query('UPDATE photo_sets SET photo_count = $1 WHERE id = $2', [photoIds.length, photoSetId]);
    
    logger.info('Photo set updated', {
      photoSetId,
      photoCount: photoIds.length,
      user: req.user.email
    });
    
    res.json({ success: true, message: 'Photo set updated successfully' });
  } catch (error) {
    logger.error('Error updating photo set', { error: error.message, photoSetId: req.params.photoSetId });
    res.status(500).json({ error: 'Failed to update photo set' });
  }
});

// Get photos used for a specific generation attempt
app.get('/api/generation-attempts/:attemptId/photos', authenticateToken, validateUUID('attemptId'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    // Get generation attempt and verify access
    const attemptResult = await db.query(`
      SELECT ga.*, o.company_id, o.assigned_client_id 
      FROM generation_attempts ga 
      JOIN orders o ON ga.order_id = o.id 
      WHERE ga.id = $1
    `, [attemptId]);
    
    const attempt = attemptResult.rows[0];
    if (!attempt) {
      return res.status(404).json({ error: 'Generation attempt not found' });
    }
    
    if (req.user.role === 'CLIENT' && attempt.assigned_client_id !== req.user.sub) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role.startsWith('COMPANY_') && attempt.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get photos from the photo set used for this attempt (if any)
    let photos = [];
    if (attempt.photo_set_id) {
      const photosResult = await db.query(`
        SELECT op.* FROM order_photos op 
        WHERE op.photo_set_id = $1 
        ORDER BY op.created_at
      `, [attempt.photo_set_id]);
      photos = photosResult.rows;
    } else {
      // Fallback: get all photos for the order at the time of generation
      const photosResult = await db.query(`
        SELECT op.* FROM order_photos op 
        WHERE op.order_id = $1 AND op.created_at <= $2
        ORDER BY op.created_at
      `, [attempt.order_id, attempt.created_at]);
      photos = photosResult.rows;
    }
    
    res.json(photos);
  } catch (error) {
    logger.error('Error getting generation attempt photos', { error: error.message, attemptId: req.params.attemptId });
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

// Bulk delete selected photos
app.delete('/api/orders/:orderId/photos', authenticateToken, validateUUID('orderId'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { photoIds } = req.body;
    
    if (!photoIds || photoIds.length === 0) {
      return res.status(400).json({ error: 'No photos selected for deletion' });
    }
    
    // Verify order access
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (req.user.role === 'CLIENT' && order.assigned_client_id !== req.user.sub) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify photos belong to this order
    const photosResult = await db.query(`
      SELECT id, filename FROM order_photos 
      WHERE id = ANY($1) AND order_id = $2
    `, [photoIds, orderId]);
    
    if (photosResult.rows.length !== photoIds.length) {
      return res.status(400).json({ error: 'Some selected photos do not belong to this order' });
    }
    
    // Delete the photos
    await db.query('DELETE FROM order_photos WHERE id = ANY($1) AND order_id = $2', [photoIds, orderId]);
    
    const deletedFilenames = photosResult.rows.map(p => p.filename);
    
    logger.info('Bulk photo deletion completed', {
      orderId,
      deletedCount: photoIds.length,
      deletedFiles: deletedFilenames,
      user: req.user.email
    });
    
    res.json({ 
      success: true, 
      message: `${photoIds.length} photos deleted successfully`,
      deletedCount: photoIds.length
    });
    
  } catch (error) {
    logger.error('Bulk photo deletion failed', { 
      error: error.message, 
      orderId: req.params.orderId,
      user: req.user?.email 
    });
    res.status(500).json({ error: 'Bulk photo deletion failed' });
  }
});

// Regenerate 3D model with selected photos
app.post('/api/orders/:orderId/regenerate', authenticateToken, validateUUID('orderId'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { photoIds, photoSetName } = req.body;
    
    if (!photoIds || photoIds.length === 0) {
      return res.status(400).json({ error: 'At least one photo must be selected' });
    }
    
    // Verify order access
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify selected photos belong to this order
    const photosResult = await db.query(`
      SELECT * FROM order_photos 
      WHERE id = ANY($1) AND order_id = $2
    `, [photoIds, orderId]);
    
    if (photosResult.rows.length !== photoIds.length) {
      return res.status(400).json({ error: 'Some selected photos do not belong to this order' });
    }
    
    // Create new photo set
    const setName = photoSetName || `Regeneration Set ${new Date().toLocaleString()}`;
    const photoSetResult = await db.query(`
      INSERT INTO photo_sets (order_id, name, photo_count)
      VALUES ($1, $2, $3) RETURNING *
    `, [orderId, setName, photoIds.length]);
    
    const photoSet = photoSetResult.rows[0];
    
    // Assign selected photos to the new set
    await db.query(`
      UPDATE order_photos 
      SET photo_set_id = $1 
      WHERE id = ANY($2) AND order_id = $3
    `, [photoSet.id, photoIds, orderId]);
    
    // Check version limits and manage if needed
    const versionManagement = req.versionManagement || 
      await versionService.checkAndManageVersions(orderId);
    
    // Update order generation status
    await db.query(`
      UPDATE orders SET 
        generation_status = 'generating', 
        generation_attempts = generation_attempts + 1
      WHERE id = $1
    `, [orderId]);
    
    // Create new generation attempt
    const attemptNumber = order.generation_attempts + 1;
    const seedValue = Math.floor(Math.random() * 1000000);
    
    const attemptResult = await db.query(`
      INSERT INTO generation_attempts (order_id, attempt_number, seed_value, status, photo_set_id)
      VALUES ($1, $2, $3, 'pending', $4) RETURNING *
    `, [orderId, attemptNumber, seedValue, photoSet.id]);
    
    const generationAttempt = attemptResult.rows[0];
    
    // Start 3D generation in background
    process.nextTick(async () => {
      try {
        // Get photo data for generation
        const photosData = photosResult.rows;
        
        // Convert base64 photos to buffers for TRELLIS
        const photoBuffers = photosData.map(photo => {
          const base64Data = photo.file_path.replace(/^data:image\/[a-z]+;base64,/, '');
          return Buffer.from(base64Data, 'base64');
        });
        
        logger.info('Starting TRELLIS 3D generation with photo set', {
          orderId,
          photoSetId: photoSet.id,
          attemptId: generationAttempt.id,
          photoCount: photoBuffers.length
        });
        
        // Initialize TRELLIS service
        const trellisService = new TRELLISService();
        
        // Process with TRELLIS
        const result = await trellisService.processImages(photoBuffers, {
          orderId,
          attemptNumber,
          seedValue
        });
        
        if (result.success) {
          // Update generation attempt with success
          await db.query(`
            UPDATE generation_attempts SET 
              status = 'completed',
              glb_url = $1,
              model_quality_score = $2,
              processing_time_seconds = $3,
              selected = true
            WHERE id = $4
          `, [result.glbUrl, result.modelQualityScore, result.processingTimeSeconds, generationAttempt.id]);
          
          // Update order with new model URL
          await db.query('UPDATE orders SET model_url = $1, generation_status = $2 WHERE id = $3', 
            [result.glbUrl, 'completed', orderId]);
          
          // Deselect other attempts
          await db.query('UPDATE generation_attempts SET selected = false WHERE order_id = $1 AND id != $2', 
            [orderId, generationAttempt.id]);
          
          logger.info('TRELLIS generation completed successfully', {
            orderId,
            attemptId: generationAttempt.id,
            modelUrl: result.glbUrl,
            qualityScore: result.modelQualityScore
          });
        } else {
          // Update generation attempt with failure
          await db.query(`
            UPDATE generation_attempts SET 
              status = 'failed',
              error_message = $1,
              processing_time_seconds = $2
            WHERE id = $3
          `, [result.error, result.processingTimeSeconds, generationAttempt.id]);
          
          await db.query('UPDATE orders SET generation_status = $1 WHERE id = $2', 
            ['failed', orderId]);
          
          logger.error('TRELLIS generation failed', {
            orderId,
            attemptId: generationAttempt.id,
            error: result.error
          });
        }
      } catch (error) {
        logger.error('Error in background generation process', {
          orderId,
          attemptId: generationAttempt.id,
          error: error.message
        });
        
        await db.query(`
          UPDATE generation_attempts SET 
            status = 'failed',
            error_message = $1
          WHERE id = $2
        `, [error.message, generationAttempt.id]);
        
        await db.query('UPDATE orders SET generation_status = $1 WHERE id = $2', 
          ['failed', orderId]);
      }
    });
    
    logger.info('Regeneration request initiated', {
      orderId,
      photoSetId: photoSet.id,
      attemptId: generationAttempt.id,
      photoCount: photoIds.length,
      user: req.user.email
    });
    
    res.status(201).json({
      success: true,
      message: 'Regeneration started successfully',
      photoSet,
      generationAttempt,
      versionManagement
    });
    
  } catch (error) {
    logger.error('Error starting regeneration', { error: error.message, orderId: req.params.orderId });
    res.status(500).json({ error: 'Failed to start regeneration' });
  }
});

// GPU quota status endpoint
app.get('/api/gpu/quota', authenticateToken, async (req, res) => {
  try {
    if (!gpuQuotaService) {
      return res.status(503).json({ error: 'GPU quota service not available' });
    }

    const quota = await gpuQuotaService.getCurrentQuota();
    res.json(quota);
  } catch (error) {
    logger.error('Error getting GPU quota', { error: error.message });
    res.status(500).json({ error: 'Failed to get quota information' });
  }
});

// Generate 3D model from uploaded photos
app.post('/api/furniture/generate-3d', 
  authenticateToken, 
  validate(schemas.generate3D),
  checkVersionLimits,
  async (req, res) => {
    try {
          const { orderId, attempts = 1, guidanceStrength, samplingSteps, seed, photoIds = [] } = req.body;
      
      // Check GPU quota and reserve slot
      if (!gpuQuotaService) {
        return res.status(503).json({ error: 'GPU quota service not available' });
      }

      const reservationResult = await gpuQuotaService.reserveGeneration(orderId, photoIds, {
        seed,
        guidanceStrength, 
        samplingSteps,
        attempts
      });

      if (reservationResult.type === 'queued') {
        // Return queued response immediately
        return res.json({
          success: true,
          type: 'queued',
          message: reservationResult.message,
          queuePosition: reservationResult.queuePosition,
          scheduledDate: reservationResult.scheduledDate,
          estimatedTime: reservationResult.estimatedTime,
          orderId
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
            
            // Record GPU usage via quota service
            if (result.processingTimeSeconds) {
              await gpuQuotaService.recordGenerationStart(orderId);
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
      
      // Return immediate response with version management info
      const response = {
        success: true,
        type: 'immediate',
        message: '3D generation started',
        orderId,
        estimatedTime: 48 * attempts,
        attempts,
        status: 'processing'
      };

      // Include version management info if available
      if (req.versionManagement) {
        response.versionManagement = req.versionManagement;
      }

      res.json(response);
      
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

// Get photos for an order
app.get('/api/furniture/photos/:orderId', 
  authenticateToken, 
  validateUUID('orderId'), 
  async (req, res) => {
    try {
          const { orderId } = req.params;
      
      // Verify order exists and user has access
      const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      const order = orderResult.rows[0];
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      if (req.user.role.startsWith('COMPANY_') && order.company_id !== req.user.company_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const photosResult = await db.query(`
        SELECT id, filename, file_path, file_size, mime_type, created_at
        FROM order_photos 
        WHERE order_id = $1 
        ORDER BY created_at DESC
      `, [orderId]);
      
      res.json(photosResult.rows);
      
    } catch (error) {
      logger.error('Failed to get photos', {
        error: error.message,
        orderId: req.params.orderId,
        user: req.user?.email
      });
      res.status(500).json({ error: 'Failed to get photos' });
    }
  }
);

// Get measurement template for furniture type
app.get('/api/furniture/measurement-template/:type', 
  authenticateToken,
  async (req, res) => {
    try {
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