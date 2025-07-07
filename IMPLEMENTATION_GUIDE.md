# 3D Model Generation System - Implementation Guide

## Overview

This guide documents the complete implementation of the 3D model generation system based on the specified requirements. The system includes GPU quota management, photo validation, version control, and queue management features.

## Architecture

### Core Components

1. **GPU Quota Service** (`api-server/src/gpuQuotaService.js`)
2. **Version Service** (`api-server/src/versionService.js`)
3. **Photo Validation** (`company-dashboard/utils/photoValidation.ts`)
4. **UI Components** (`company-dashboard/components/`)

### Database Schema

#### New Tables Added

```sql
-- GPU Usage Tracking
CREATE TABLE gpu_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_seconds_used INTEGER DEFAULT 0,
    generation_count INTEGER DEFAULT 0,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);

-- Generation Queue
CREATE TABLE generation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    photo_ids UUID[] NOT NULL,
    generation_options JSONB DEFAULT '{}',
    queue_position INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'queued',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Photo Sets
CREATE TABLE photo_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    photo_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Modified Tables

```sql
-- Enhanced Generation Attempts
ALTER TABLE generation_attempts ADD COLUMN archived BOOLEAN DEFAULT FALSE;
ALTER TABLE generation_attempts ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE generation_attempts ADD COLUMN archive_reason VARCHAR(100);
ALTER TABLE generation_attempts ADD COLUMN last_accessed_at TIMESTAMPTZ DEFAULT NOW();

-- Enhanced Photo Storage
ALTER TABLE order_photos ADD COLUMN photo_set_id UUID REFERENCES photo_sets(id) ON DELETE SET NULL;
```

## Feature Implementation Details

### 1. GPU Quota Management

#### Daily Limits (31 generations/day)
- Based on 25 minutes total daily GPU time
- 48 seconds per generation average
- Automatic reset at midnight UTC

#### Implementation
```javascript
class GPUQuotaService {
  constructor(db) {
    this.db = db;
    this.DAILY_LIMIT = 31;
    this.SECONDS_PER_GENERATION = 48;
  }

  async getCurrentQuota() {
    // Returns current usage, remaining slots, reset time
  }

  async reserveGeneration(orderId, photoIds, options) {
    // Returns immediate slot or queue position
  }
}
```

#### API Endpoints
- `GET /api/gpu/quota` - Current quota status
- `GET /api/generation-queue/status` - Queue status
- `GET /api/orders/{id}/queue-position` - Order queue position

### 2. Photo Validation System

#### Client-Side Analysis
```typescript
interface PhotoValidation {
  status: 'good' | 'warning' | 'poor';
  scores: {
    resolution: 'good' | 'adequate' | 'poor';
    blur: number; // 0-10, higher is sharper
    lighting: 'good' | 'adequate' | 'poor';
    furnitureVisibility: number; // 0-1
  };
  recommendation: string;
  canProceed: boolean;
  issues: string[];
}
```

#### Validation Criteria
- **Resolution**: Min 512px (blocks), 1024px+ (good)
- **Blur**: Edge detection algorithm, 0-10 scale
- **Lighting**: Brightness analysis, shadow detection
- **Visibility**: Furniture object detection proxy

#### Traffic Light System
- 🟢 **Good**: Score ≥ 0.8, auto-selected
- 🟡 **Warning**: 0.5 ≤ score < 0.8, user choice
- 🔴 **Poor**: Score < 0.5, warn but allow

### 3. Version Management

#### Soft Limit System
- Keep last 5 active versions per order
- Auto-archive oldest when 6th version created
- Prefer archiving non-selected versions

#### Archive Retention
- 90-day retention period for archived versions
- User can restore within retention window
- Permanent deletion after 90 days

#### Implementation
```javascript
class VersionService {
  async checkAndManageVersions(orderId) {
    // Check if at version limit
    // Auto-archive if needed
    // Return management result
  }

  async archiveVersion(attemptId, reason) {
    // Archive with reason tracking
  }

  async restoreVersion(attemptId) {
    // Restore with limit checking
  }
}
```

### 4. Queue Management

#### Over-Limit Handling
```javascript
// When daily limit reached
if (quota.remaining === 0) {
  const queueResult = await addToQueue(orderId, photoIds, options);
  return {
    type: 'queued',
    queuePosition: queueResult.position,
    scheduledDate: queueResult.scheduledDate,
    estimatedTime: queueResult.estimatedTime,
    message: `Daily limit reached. Queued for tomorrow at position #${queueResult.position}`
  };
}
```

#### Queue Processing
- FIFO (First In, First Out) processing
- Automatic processing at midnight UTC
- Real-time position updates

### 5. Progress Tracking

#### TRELLIS Stages
```typescript
const stages = [
  { name: 'uploading', percent: '0-6%', duration: '3s' },
  { name: 'background_removal', percent: '6-12%', duration: '3s' },
  { name: 'generating_3d', percent: '12-42%', duration: '15s' },
  { name: 'extracting_glb', percent: '42-100%', duration: '30s' }
];
```

#### Real-Time Updates
- WebSocket or polling for stage updates
- Accurate percentage tracking
- Estimated completion times

### 6. UI Components

#### PhotoUploader Enhancements
```typescript
interface PhotoPreview {
  file: File;
  preview: string;
  validation?: PhotoValidation;
  selected: boolean;
  validating: boolean;
}
```

Features:
- Real-time quality analysis
- Bulk selection/deletion
- Quality-based auto-selection
- Visual quality indicators

#### VersionManager Component
```typescript
interface VersionManagerProps {
  orderId: string;
  onVersionSelected?: (version: GenerationAttempt) => void;
}
```

Features:
- Version list with quality scores
- Archive/restore operations
- Bulk quality cleanup
- Storage usage tracking

#### QueueStatus Component
- Real-time quota display
- Queue position tracking
- Estimated processing times
- Next reset countdown

## Integration Points

### 1. Generation Workflow Integration

```javascript
// Enhanced generation endpoint
app.post('/api/furniture/generate-3d', 
  authenticateToken,
  validate(schemas.generate3D),
  checkVersionLimits, // New middleware
  async (req, res) => {
    // Check GPU quota
    const reservation = await gpuQuotaService.reserveGeneration(...);
    
    if (reservation.type === 'queued') {
      return res.json(reservation);
    }
    
    // Proceed with generation
    // Record GPU usage
    // Handle version management
  }
);
```

### 2. Photo Upload Integration

```javascript
// Enhanced upload endpoint
app.post('/api/furniture/upload-photos/:orderId',
  authenticateToken,
  validateUUID('orderId'),
  upload.array('photos', 5),
  async (req, res) => {
    // Create photo set
    const photoSet = await createPhotoSet(orderId);
    
    // Process and validate photos
    // Store with set association
    // Return validation results
  }
);
```

### 3. Frontend Integration

```typescript
// Usage in order pages
import QueueStatus from '../components/QueueStatus';
import VersionManager from '../components/VersionManager';
import PhotoUploader from '../components/PhotoUploader';

// Component composition for complete workflow
<PhotoUploader onPhotosSelected={handlePhotos} />
<QueueStatus orderId={orderId} onStatusChange={setCanGenerate} />
<VersionManager orderId={orderId} onVersionSelected={handleVersion} />
```

## Configuration

### Environment Variables
```bash
# GPU Quota Settings
GPU_DAILY_LIMIT=31
GPU_SECONDS_PER_GENERATION=48
GPU_RESET_HOUR=0  # UTC hour for daily reset

# Version Management
VERSION_SOFT_LIMIT=5
ARCHIVE_RETENTION_DAYS=90

# Photo Validation
MIN_RESOLUTION=512
GOOD_RESOLUTION=1024
MAX_FILE_SIZE=10485760  # 10MB
```

### Database Configuration
```sql
-- Indexes for performance
CREATE INDEX idx_gpu_usage_date ON gpu_usage_log(date);
CREATE INDEX idx_generation_queue_status ON generation_queue(status, scheduled_date);
CREATE INDEX idx_generation_attempts_order_archived ON generation_attempts(order_id, archived);
CREATE INDEX idx_order_photos_set_id ON order_photos(photo_set_id);
```

## Monitoring and Maintenance

### Key Metrics
1. **GPU Usage**:
   - Daily generation count
   - Queue length and wait times
   - Success/failure rates

2. **Photo Quality**:
   - Validation pass rates
   - Quality score distribution
   - User override frequency

3. **Version Management**:
   - Active vs archived versions
   - Archive/restore frequency
   - Storage usage trends

### Maintenance Tasks
1. **Daily**: Process generation queue
2. **Weekly**: Archive quality cleanup
3. **Monthly**: Delete expired archives
4. **Quarterly**: Usage analytics review

### Logging
```javascript
// Comprehensive logging throughout
logger.info('GPU generation started', { orderId, quotaUsed });
logger.warn('Version limit reached', { orderId, archivedVersion });
logger.error('Photo validation failed', { filename, errors });
```

## Security Considerations

### Data Protection
- Photo validation runs client-side
- Server-side re-validation for security
- Secure file storage and access

### Rate Limiting
- Per-user generation limits
- API endpoint rate limiting
- Queue position validation

### Access Control
- User-level permissions
- Company-level data isolation
- Admin-only maintenance functions

## Performance Optimizations

### Client-Side
- Parallel photo validation
- Progressive image loading
- Optimized blur detection algorithm

### Server-Side
- Database connection pooling
- Queue processing optimization
- Archived data cleanup

### Caching
- GPU quota status caching
- Photo validation result caching
- Version metadata caching

## Deployment Checklist

### Database Migration
1. ✅ Run schema updates
2. ✅ Create indexes
3. ✅ Migrate existing data
4. ✅ Verify constraints

### Service Deployment
1. ✅ Deploy updated API server
2. ✅ Deploy frontend components
3. ✅ Configure environment variables
4. ✅ Test all endpoints

### Monitoring Setup
1. ✅ Configure logging
2. ✅ Set up metrics collection
3. ✅ Create alerting rules
4. ✅ Test notification systems

### User Training
1. ✅ Document new features
2. ✅ Create user guides
3. ✅ Train support team
4. ✅ Prepare FAQ responses

## Troubleshooting Guide

### Common Issues

#### Queue Not Processing
- Check GPU quota service status
- Verify cron job configuration
- Review queue table for stuck items

#### Photo Validation Errors
- Verify client-side validation library
- Check image processing capabilities
- Review validation criteria settings

#### Version Archiving Problems
- Check version service database connections
- Verify archive retention settings
- Review storage cleanup processes

#### Performance Issues
- Monitor database query performance
- Check photo validation processing times
- Review queue processing efficiency

### Debug Commands
```bash
# Check quota status
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/gpu/quota

# Verify queue position
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/orders/{id}/queue-position

# Test photo validation
curl -X POST -F "photo=@test.jpg" http://localhost:8000/api/photo/validate
```

## Future Enhancements

### Phase 2 Features
1. **Premium Queue Access**: Priority processing for premium users
2. **Advanced Quality Metrics**: ML-based quality scoring
3. **Batch Processing**: Multiple photo generation optimization
4. **Real-time Notifications**: WebSocket-based updates

### Scalability Improvements
1. **Horizontal Scaling**: Multi-server queue processing
2. **CDN Integration**: Optimized photo delivery
3. **Microservice Architecture**: Service separation
4. **Advanced Caching**: Redis integration

This implementation provides a robust, scalable foundation for the 3D model generation system with comprehensive quality control, resource management, and user experience optimization.