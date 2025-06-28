# 3D Measurement App

A complete 3D measurement workflow application with IKEA-style measurements, client portal, and company dashboard.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation
```bash
# Install dependencies for all packages
npm install
cd client-portal && npm install && cd ..
cd company-dashboard && npm install && cd ..
cd api-server && npm install && cd ..

# Build shared packages
cd packages/3d-tools && npm run build && cd ../..
cd packages/api-client && npm run build && cd ../..
cd shared && npm run build && cd ..

# Start all services
npm run dev
```

### Quick Setup Script
```bash
# Run this single command to set everything up
./scripts/setup.sh
```

### Services
- **Client Portal**: http://localhost:3000
- **Company Dashboard**: http://localhost:3001  
- **API Server**: http://localhost:8000

## 📋 Demo Credentials

### Company Login (Dashboard)
- **URL**: http://localhost:3001/login
- **Email**: admin@acme.com
- **Password**: admin123
- **Subdomain**: acme

### Client Login (Portal)  
- **URL**: http://localhost:3000/login
- **Email**: client1@example.com
- **Password**: client123

## 🏗️ Architecture

### Frontend Applications
```
/client-portal        # Port 3000 - Client measurement input
/company-dashboard    # Port 3001 - Company order management
```

### Backend Services
```
/api-server          # Port 8000 - REST API with JWT auth
```

### Shared Packages
```
/packages/3d-tools   # 3D ModelViewer with IKEA-style measurements
/packages/api-client # HTTP client with JWT handling
/packages/shared     # Shared types and utilities
```

## 🎯 Key Features

### 3D Measurement System
- **IKEA-style measurements** - External dimensions that don't obscure the object
- **Smart positioning** - Automatically switches to closest visible edges
- **Camera-responsive** - Measurements adjust as you rotate the view
- **3D arrow heads** - Properly oriented using quaternion rotation
- **Interactive controls** - Click to select measurement points

### Client Workflow
1. Login to client portal
2. View assigned orders
3. Open 3D measurement interface
4. Click points on 3D model to create measurements
5. Input measurement values and notes
6. Save measurements for company review

### Company Workflow  
1. Login to company dashboard with subdomain
2. Create new orders with 3D models
3. Assign orders to clients
4. Monitor measurement progress
5. Review completed measurements

## 🔧 Technical Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **3D Engine**: React Three Fiber, Three.js
- **Styling**: Tailwind CSS
- **Backend**: Express.js, JWT authentication
- **Data**: In-memory store (MVP) - ready for database integration

## 📁 Project Structure

```
3d-measurement-app/
├── client-portal/           # Client measurement interface
│   ├── app/
│   │   ├── client/orders/   # Client routes
│   │   ├── demo/           # 3D demo page
│   │   └── login/          # Client login
│   └── public/sample-models/ # 3D model files
├── company-dashboard/       # Company management interface  
│   └── app/
│       ├── company/[subdomain]/ # Company routes
│       └── login/              # Company login
├── api-server/             # REST API backend
│   └── src/index.js        # Express server with endpoints
├── packages/              # Shared packages
│   ├── 3d-tools/          # ModelViewer component
│   ├── api-client/        # HTTP client
│   └── shared/            # Common utilities
└── scripts/               # Build and generation scripts
```

## 🎮 Demo Workflow

### 1. Test 3D Measurements
- Visit: http://localhost:3000/demo
- Rotate camera around cube
- Watch measurements reposition automatically
- Toggle measurements on/off

### 2. Company Dashboard
- Login at http://localhost:3001/login
- Create new orders
- Assign to clients  
- View 3D models and measurements

### 3. Client Portal
- Login at http://localhost:3000/login
- View assigned orders
- Input measurements on 3D models
- Save measurement data

## 🔐 Authentication

Simple JWT-based authentication for MVP:
- Token expiry checking
- Role-based access control
- Automatic redirect on 401 errors
- localStorage token management

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Orders
- `GET /api/orders` - List orders (filtered by user role)
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order (company only)
- `PUT /api/orders/:id` - Update order

### Measurements
- `GET /api/orders/:id/measurements` - List measurements
- `POST /api/orders/:id/measurements` - Create measurement
- `PUT /api/orders/:id/measurements/:id` - Update measurement
- `DELETE /api/orders/:id/measurements/:id` - Delete measurement

## 🎨 3D Models

Sample models included:
- `cube.glb` - Simple 1x1x1 cube for testing
- `room.glb` - Basic room geometry  
- `cabinet.glb` - Kitchen cabinet model

All models are normalized to 1x1x1 bounding box and centered at origin.

## 🚧 Development

### Building Packages
```bash
# Build all packages
npm run build --workspaces

# Build specific package
cd packages/3d-tools && npm run build
```

### Adding Dependencies
```bash
# Add to specific workspace
npm install package-name -w client-portal

# Add to root
npm install package-name
```

### Troubleshooting

**3D Models Not Loading:**
- Check that models exist in both `client-portal/public/sample-models/` and `company-dashboard/public/sample-models/`
- Run: `cp client-portal/public/sample-models/* company-dashboard/public/sample-models/`

**Build Errors:**
- Ensure packages are built in order: `npm run build-packages`
- Clear Next.js cache: `rm -rf .next` in each app directory

**Import Errors:**
- Verify TypeScript paths in `tsconfig.json`
- Check that all packages have been built with `npm run build`

**UI/UX Improvements:**
- Form inputs now have proper dark text contrast on white backgrounds
- App background changed to warm off-white (#fafafa) for better readability
- 3D Canvas background matches the app theme
- All input fields have consistent styling across both portals

## 🔮 Next Steps

Ready for production enhancements:
- Database integration (PostgreSQL/MongoDB)
- File upload for photos and models
- Real-time updates with WebSockets
- JWT refresh token implementation
- Photo-to-3D generation integration
- Advanced measurement tools
- Export capabilities

## 📝 License

MIT License - see LICENSE file for details.