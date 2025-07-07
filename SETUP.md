# 3D Measurement App - Setup Guide

Complete setup instructions for the 3D measurement application with GPU quota management, photo validation, and version control features.

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git
- PostgreSQL (via Docker)

## Quick Start

```bash
git clone <repository-url>
cd 3d-measurement-app
cp .env.example .env
# Edit .env file with your API keys (see Configuration section)
docker-compose up -d
npm install
npm run dev
```

## Detailed Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd 3d-measurement-app
```

### 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/app_db"

# JWT Secret (REQUIRED - Change in production)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# CRITICAL: Hugging Face API Key for TRELLIS 3D Generation
HUGGINGFACE_API_KEY="hf_your_actual_api_key_here"
TRELLIS_SPACE_URL="https://huggingface.co/spaces/Lemonator/multi-image-to-3d"

# Optional: Google OAuth (for enhanced authentication)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: Email Configuration (for notifications)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@3dmeasure.app"

# Optional: Cloudflare R2 Storage (for model files)
CLOUDFLARE_R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-r2-access-key"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-r2-secret-key"
CLOUDFLARE_R2_BUCKET_NAME="3d-measurement-models"
CLOUDFLARE_R2_PUBLIC_DOMAIN="your-custom-domain.com"

# Optional: Vercel Blob Storage (alternative to R2)
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

### 3. Get Required API Keys

#### 🔑 Hugging Face API Key (REQUIRED)

**This is essential for 3D model generation.**

1. Go to [Hugging Face](https://huggingface.co/)
2. Create an account or sign in
3. Go to Settings → Access Tokens
4. Create a new token with "Read" permissions
5. Copy the token (starts with `hf_`)
6. Add it to your `.env` file:
   ```
   HUGGINGFACE_API_KEY="hf_your_actual_api_key_here"
   ```

#### 🔑 Google OAuth (Optional)

For enhanced authentication:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3001/api/auth/callback/google`

### 4. Database Setup with Docker

Start PostgreSQL using Docker Compose:

```bash
docker-compose up -d postgres
```

Wait for PostgreSQL to start, then create the database schema:

```bash
# Connect to the database
docker exec -it 3d-measurement-app-postgres-1 psql -U user -d app_db

# Or if the container name is different:
docker ps  # Find the postgres container name
docker exec -it <postgres-container-name> psql -U user -d app_db
```

Run the schema setup:
```sql
-- Copy and paste the contents of api-server/schema.sql
\i /path/to/schema.sql
-- Or manually copy the SQL from api-server/schema.sql
```

### 5. Install Dependencies

Install dependencies for all services:

```bash
# Root dependencies (for running all services)
npm install

# API Server dependencies
cd api-server && npm install && cd ..

# Company Dashboard dependencies  
cd company-dashboard && npm install && cd ..

# Client Portal dependencies
cd client-portal && npm install && cd ..

# Shared components
cd shared && npm install && cd ..
```

### 6. Database Migration

Initialize the database with sample data:

```bash
cd api-server
node src/seed.js
```

This creates:
- Sample company (Acme Corp)
- Admin user (admin@acme.com / admin123)
- Test orders and measurements

### 7. Start the Application

#### Option A: Start All Services (Recommended)
```bash
npm run dev
```

This starts:
- API Server on port 8000
- Company Dashboard on port 3000  
- Client Portal on port 3001

#### Option B: Start Individual Services
```bash
# API Server only
cd api-server && npm run dev

# Company Dashboard only  
cd company-dashboard && npm run dev

# Client Portal only
cd client-portal && npm run dev
```

## Application Access

### 🌐 URLs
- **Company Dashboard**: http://localhost:3000
- **Client Portal**: http://localhost:3001
- **API Server**: http://localhost:8000

### 🔐 Default Credentials
- **Email**: admin@acme.com
- **Password**: admin123

## Docker Services

The application uses Docker for:

### PostgreSQL Database
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Optional: Redis (for caching)
```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Key Features Implemented

### 🎯 GPU Quota Management
- Daily limit: 31 generations (25 minutes total GPU time)
- 48 seconds per generation average
- Automatic queue for over-limit requests
- Daily reset at midnight UTC

### 📸 Photo Validation System
- Client-side blur detection
- Resolution analysis (minimum 512px)
- Lighting quality assessment
- Traffic light UI (🟢🟡🔴)
- Auto-selection of good quality photos

### 📦 Version Management
- Keep last 5 active versions per order
- Auto-archive oldest when limit exceeded
- 90-day archive retention
- Quality-based cleanup options

### 🔄 Progress Tracking
Real-time TRELLIS processing stages:
1. Uploading image (0-6%, ~3s)
2. Removing background (6-12%, ~3s)  
3. Generating 3D model (12-42%, ~15s)
4. Extracting GLB file (42-100%, ~30s)

### 🗂️ Photo Organization
- Automatic photo set creation per upload
- Bulk photo operations (select/delete)
- Photo quality scoring and filtering

## Testing the Features

### 1. Test GPU Quota System
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/gpu/quota
```

Expected response:
```json
{
  "dailyLimit": 31,
  "used": 0,
  "remaining": 31,
  "resetTime": "2025-06-30T00:00:00.000Z",
  "percentUsed": 0
}
```

### 2. Test Photo Validation
1. Go to Company Dashboard (http://localhost:3000)
2. Login with admin@acme.com / admin123
3. Create or select an order
4. Upload photos and observe:
   - Real-time quality analysis
   - Traffic light color coding
   - Auto-selection of good photos
   - Bulk operation controls

### 3. Test 3D Generation
1. Upload photos through the dashboard
2. Start 3D generation
3. Observe real-time progress through TRELLIS stages
4. Check version management after generation

### 4. Test Queue Management
1. Make 31+ generation requests in one day
2. Verify queue position and estimated times
3. Check queue status endpoint

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill processes using ports 3000, 3001, 8000
lsof -i :8000 && kill -9 <PID>
lsof -i :3000 && kill -9 <PID>
lsof -i :3001 && kill -9 <PID>
```

#### Database Connection Failed
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

#### TRELLIS API Errors
- Verify `HUGGINGFACE_API_KEY` is correct
- Check Hugging Face API quota/limits
- Ensure TRELLIS space URL is accessible

#### GPU Quota Service Not Available
- Ensure database is connected
- Check that schema includes `gpu_usage_log` table
- Verify service initialization in logs

### Log Files
- API Server: `api-server/logs/combined.log`
- Error logs: `api-server/logs/error.log`
- Console output: Check terminal running the services

### Health Checks
```bash
# API Server health
curl http://localhost:8000/health

# Database connection test  
curl http://localhost:8000/api/db-test

# GPU quota status
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/gpu/quota
```

## Production Deployment

### Environment Variables
1. Change all default secrets in `.env`
2. Use strong passwords and JWT secrets
3. Configure production database URLs
4. Set up proper CORS origins
5. Use HTTPS in production

### Database
1. Use managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
2. Set up automated backups
3. Configure connection pooling
4. Monitor performance

### Storage
1. Configure Cloudflare R2 or AWS S3 for model files
2. Set up CDN for photo delivery
3. Implement proper file cleanup policies

### Monitoring
1. Set up logging aggregation
2. Monitor GPU quota usage
3. Track generation success rates
4. Alert on service failures

## Support

For issues and questions:
1. Check this setup guide
2. Review the logs for error messages
3. Verify all environment variables are set
4. Ensure all services are running

## API Documentation

Key endpoints implemented:

### Authentication
- `POST /api/auth/login` - User login
- JWT tokens required for protected endpoints

### GPU Quota Management
- `GET /api/gpu/quota` - Current quota status
- `GET /api/generation-queue/status` - Queue status
- `GET /api/orders/{id}/queue-position` - Order queue position

### Photo Management
- `POST /api/furniture/upload-photos/{orderId}` - Upload photos
- `GET /api/furniture/photos/{orderId}` - Get order photos
- Photo validation happens client-side automatically

### 3D Generation
- `POST /api/furniture/generate-3d` - Start generation (with quota checking)
- Progress tracking via WebSocket or polling

### Version Management
- `GET /api/orders/{orderId}/versions` - Get versions
- `POST /api/versions/{id}/archive` - Archive version
- `POST /api/versions/{id}/restore` - Restore version
- `POST /api/orders/{orderId}/versions/cleanup-quality` - Archive low quality

The application is now ready for production use with all advanced features implemented!