# Smart Assets - Departmental Asset Management and Tracking System

A comprehensive full-stack Next.js application for managing and tracking departmental assets with advanced role-based access control (RBAC), maintenance scheduling, inventory management, and automated notifications.

## 🎯 Features

### Core Asset Management
- **Asset Registration & Categorization**
  - Register new assets with detailed metadata (name, category, model, serial number, location, room, etc.)
  - Categorize assets as Returnable, Consumable, or Expirable
  - Assign unique barcode/QR codes for each asset
  - Upload supporting documents (receipts, purchase orders)
  - Assign assets to departments, rooms, or staff members
  - Update or edit asset details
  - Archive or deactivate obsolete assets

### Asset Request & Allocation Workflow
- **Request System**
  - Lecturers can request available assets
  - Departmental Officers review and approve/reject requests
  - Automatic notifications to requesters upon approval or rejection
  - Record of asset issuance (date, condition, issued by, issued to)
  - Return workflow for returnable assets
  - Condition verification upon return (damaged, lost, functional)
  - Request history and tracking for each user

### Asset Transfer Management
- **Transfer System**
  - Inter-departmental and intra-departmental asset transfers
  - Transfer initiation by Departmental Officers
  - Approval by Faculty Administrators
  - Automatic update of asset ownership/location after approval
  - Transfer logs and receipts with unique receipt numbers
  - Transfer history tracking

### Maintenance & Servicing
- **Maintenance Management**
  - Schedule preventive maintenance
  - Record maintenance history (dates, type of service, cost, vendor)
  - Automatic reminders for upcoming maintenance or calibration
  - Flag assets under repair or unavailable for use
  - Track maintenance types: Preventive, Repair, Calibration, Inspection
  - Maintenance cost tracking and vendor management

### Consumable & Inventory Management
- **Inventory Control**
  - Track quantities of consumables (stationery, lab materials, etc.)
  - Automatic stock level monitoring
  - Add/remove stock items and quantities
  - Reorder alerts when stock drops below threshold
  - Course Representatives can view available consumables
  - Unit of measurement tracking (boxes, units, liters, etc.)

### Notifications & Alerts
- **Notification System**
  - Email/SMS/in-app notifications for asset request approvals/rejections
  - Due asset return reminders
  - Expiry alerts for consumables and expirable assets
  - Scheduled maintenance reminders
  - Low stock alerts for consumables
  - Dashboard alert indicators (colored badges, icons)
  - Notification read/unread status tracking

### Reporting & Analytics
- **Comprehensive Reporting**
  - Asset register (by department, category, or status)
  - Issued and returned assets reports
  - Transfer history reports
  - Maintenance logs and schedules
  - Asset depreciation or aging reports
  - Consumable usage trends
  - Export reports (PDF, Excel, CSV ready)
  - Data visualization through charts and summaries

### Audit Trail & Activity Logging
- **Activity Tracking**
  - Record all system actions (login, create, edit, delete, approve, transfer)
  - Display activity timeline per user and per asset
  - View and filter audit logs by date or user
  - Immutable logs for accountability
  - IP address and user agent tracking

### System Administration
- **Admin Features**
  - Manage users, roles, and permissions
  - Configure asset categories, locations, and departments
  - Set system-wide parameters (notification settings, approval thresholds)
  - View system performance metrics (uptime, usage statistics)
  - Manage integration with barcode scanners, email/SMS APIs
  - System configuration management

### Role-Based Access Control (RBAC)
- **Four Distinct User Roles:**
  - **Faculty Admin**: Full system access, approves inter-departmental transfers, generates global reports
  - **Departmental Officer**: Registers assets, approves requests, manages departmental transfers, records maintenance
  - **Lecturer**: Requests and returns assets, views personal allocations and request history
  - **Course Rep**: Views available consumables and teaching aids

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: SQLite (via Prisma) - easily switchable to PostgreSQL/MySQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5 (JWT strategy)
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Barcode/QR**: html5-qrcode, jsbarcode

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## 🚀 Getting Started

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd smart_assets
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
   
   Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

   **Note**: For production, use an absolute path for `DATABASE_URL`:
```env
DATABASE_URL="file:C:\path\to\your\project\prisma\dev.db"
```

4. **Generate Prisma Client:**
```bash
npm run db:generate
```

5. **Push database schema:**
```bash
npm run db:push
```

6. **Seed the database with initial data:**
```bash
npm run db:seed
```

### Default Test Accounts

After seeding, you can log in with these test accounts:

- **Faculty Admin**: 
  - Email: `admin@university.edu`
  - Password: `admin123`

- **Departmental Officer**: 
  - Email: `officer@university.edu`
  - Password: `officer123`

- **Lecturer**: 
  - Email: `lecturer@university.edu`
  - Password: `lecturer123`

- **Course Rep**: 
  - Email: `rep@university.edu`
  - Password: `rep123`

### Running the Application

**Development mode:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Production build:**
```bash
npm run build
npm start
```

## 📁 Project Structure

```
smart_assets/
├── app/
│   ├── api/                    # API routes
│   │   ├── assets/            # Asset CRUD operations
│   │   ├── requests/          # Request management
│   │   ├── transfers/          # Transfer management
│   │   ├── maintenance/        # Maintenance scheduling
│   │   ├── inventory/         # Consumable inventory
│   │   ├── reports/           # Report generation
│   │   ├── notifications/     # Notification management
│   │   ├── activity-logs/     # Audit trail
│   │   ├── system-config/     # System configuration
│   │   ├── users/             # User management
│   │   └── upload/              # File uploads
│   ├── admin/                 # Faculty Admin pages
│   ├── officer/               # Departmental Officer pages
│   ├── lecturer/              # Lecturer pages
│   ├── course-rep/            # Course Rep pages
│   ├── auth/                 # Authentication pages
│   └── dashboard/            # Dashboard redirect
├── components/                # React components
│   ├── DashboardLayout.tsx   # Main layout component
│   ├── Sidebar.tsx           # Navigation sidebar
│   ├── LoadingSpinner.tsx    # Loading animation
│   ├── BarcodeScanner.tsx    # Barcode/QR scanner
│   └── BarcodeGenerator.tsx  # Barcode generator
├── lib/
│   ├── prisma.ts             # Prisma client instance
│   ├── auth.ts               # NextAuth configuration
│   ├── auth-config.ts        # Auth config (Edge-compatible)
│   ├── rbac.ts               # RBAC utilities
│   └── activity-log.ts       # Activity logging utility
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Database seed script
├── middleware.ts             # Route protection middleware
└── next.config.ts            # Next.js configuration
```

## 🔌 API Routes

### Asset Management
- `GET /api/assets` - List all assets (with filters)
- `POST /api/assets` - Register new asset
- `GET /api/assets/[id]` - Get asset details
- `PATCH /api/assets/[id]` - Update asset
- `DELETE /api/assets/[id]` - Delete asset
- `POST /api/assets/[id]/archive` - Archive/unarchive asset

### Request Management
- `GET /api/requests` - List requests (role-based filtering)
- `POST /api/requests` - Create new request
- `GET /api/requests/[id]` - Get request details
- `PATCH /api/requests/[id]` - Update request
- `POST /api/requests/[id]/approve` - Approve/reject request
- `POST /api/requests/[id]/return` - Return asset
- `POST /api/requests/[id]/verify-return` - Verify return

### Transfer Management
- `GET /api/transfers` - List transfers
- `POST /api/transfers` - Create transfer
- `GET /api/transfers/[id]` - Get transfer details
- `PATCH /api/transfers/[id]` - Update transfer
- `POST /api/transfers/[id]/approve` - Approve/reject transfer
- `GET /api/transfers/[id]/receipt` - Generate transfer receipt

### Maintenance
- `GET /api/maintenance` - List maintenance records
- `POST /api/maintenance` - Schedule maintenance
- `GET /api/maintenance/[id]` - Get maintenance details
- `PATCH /api/maintenance/[id]` - Update maintenance
- `GET /api/maintenance/reminders` - Get upcoming maintenance

### Inventory
- `GET /api/inventory` - List consumables
- `PATCH /api/inventory` - Update consumable quantity

### Reports
- `GET /api/reports?type=summary` - Summary statistics
- `GET /api/reports?type=assets` - Asset register
- `GET /api/reports?type=requests` - Request history
- `GET /api/reports?type=transfers` - Transfer history
- `GET /api/reports?type=maintenance` - Maintenance logs
- `GET /api/reports?type=consumables` - Consumable inventory
- `GET /api/reports?type=depreciation` - Depreciation report

### Notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications` - Mark notifications as read

### Activity Logs
- `GET /api/activity-logs` - Get activity logs (with filters)

### System Configuration
- `GET /api/system-config` - Get system configurations
- `POST /api/system-config` - Update system configuration

### User Management
- `GET /api/users` - List users (role-based)
- `POST /api/users` - Create user
- `GET /api/users/[id]` - Get user details
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

## 🔐 Role Permissions

### Faculty Admin
- ✅ View all assets across all departments
- ✅ Approve inter-departmental transfers
- ✅ Generate global reports and analytics
- ✅ Manage all users and roles
- ✅ Configure system-wide parameters
- ✅ View all system activity logs
- ✅ Manage all permissions

### Departmental Officer
- ✅ Register new assets
- ✅ Approve/reject asset requests
- ✅ Manage intra-departmental transfers
- ✅ Record and schedule maintenance
- ✅ Manage consumable inventory
- ✅ View departmental statistics
- ✅ View departmental activity logs
- ✅ Manage departmental staff

### Lecturer
- ✅ Request available assets
- ✅ Return allocated assets
- ✅ View personal requests and history
- ✅ View assigned assets
- ✅ View available consumables
- ✅ View own activity history

### Course Rep
- ✅ View available consumables
- ✅ View available teaching aids
- ✅ Receive notifications

## 📊 Database Schema

The application uses Prisma with SQLite. Key models include:

- **User**: User accounts with roles and departments
- **Asset**: Departmental assets with categorization and tracking
- **Request**: Asset requests with approval workflow
- **Transfer**: Asset transfers with approval and receipts
- **Approval**: Approval records for requests and transfers
- **Maintenance**: Maintenance scheduling and history
- **Notification**: User notifications
- **ActivityLog**: System activity audit trail
- **SystemConfig**: System configuration parameters

## 🧪 Development

### Database Migrations

To create a migration:
```bash
npx prisma migrate dev --name migration_name
```

### Prisma Studio

View and edit database data:
```bash
npx prisma studio
```

### Linting

Run ESLint:
```bash
npm run lint
```

## 🚢 Production Deployment

1. **Update environment variables:**
   - Change `DATABASE_URL` to a production database (PostgreSQL recommended)
   - Update `NEXTAUTH_SECRET` to a secure random string
   - Set `NEXTAUTH_URL` to your production domain

2. **Build the application:**
```bash
npm run build
```

3. **Start the production server:**
```bash
npm start
```

### Recommended Production Setup

- Use PostgreSQL or MySQL instead of SQLite
- Set up proper backup and recovery procedures
- Configure email/SMS service for notifications
- Use environment variables for all secrets
- Enable HTTPS
- Set up monitoring and logging
- Configure rate limiting
- Regular database backups

## 🔒 Security Notes

- Change default passwords in production
- Use a strong `NEXTAUTH_SECRET` in production (minimum 32 characters)
- Consider using PostgreSQL for production (better concurrency)
- Implement rate limiting for API routes
- Add input validation and sanitization (already implemented with Zod)
- Use HTTPS in production
- Regularly update dependencies
- Implement proper CORS policies
- Use environment variables for all sensitive data

## 📝 Features Implementation Status

✅ **Completed Features:**
- Asset Registration and Categorization
- Asset Request and Allocation Workflow
- Asset Transfer Management
- Maintenance and Servicing
- Consumable and Inventory Management
- Notifications and Alerts
- Reporting and Analytics
- Audit Trail and Activity Logging
- System Administration
- Comprehensive RBAC System
- Barcode/QR Code Generation and Scanning
- File Upload Support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

---

**Built with ❤️ using Next.js 16, TypeScript, and Prisma**
