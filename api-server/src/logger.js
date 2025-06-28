import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  defaultMeta: { service: '3d-measurement-api' },
  transports: [
    // Write errors to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// Add console logging for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      simple()
    )
  }));
}

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    user: req.user?.email || 'anonymous'
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    
    logger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.email || 'anonymous'
    });
    
    return originalJson.call(this, data);
  };

  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  logger.error('HTTP Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    user: req.user?.email || 'anonymous',
    ip: req.ip
  });
  
  next(err);
};

export default logger;