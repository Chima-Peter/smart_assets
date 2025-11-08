# Departmental Asset Management and Tracking System

A full-stack Next.js application for managing and tracking departmental assets with role-based access control (RBAC).

## Features

- **Role-Based Access Control (RBAC)** with four distinct user roles:
  - **Faculty Admin**: Oversees entire flow, approves in-department transfers, generates reports
  - **Departmental Officer**: Registers assets, approves requests, manages internal transfers
  - **Lecturer**: Requests and returns items, views personal allocations
  - **Course Rep**: Views available consumables and teaching aids

- **Asset Management**: Register, track, and manage departmental assets
- **Request System**: Lecturers can request assets with approval workflow
- **Transfer Management**: Internal asset transfers with approval process
- **Reporting**: Generate comprehensive reports (Faculty Admin only)
- **User Management**: Create and manage users (Faculty Admin only)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (via Prisma)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smart_assets
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

4. Generate Prisma Client:
```bash
npm run db:generate
```

5. Push database schema:
```bash
npm run db:push
```

6. Seed the database with initial users:
```bash
npm run db:seed
```

### Default Users

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

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
smart_assets/
├── app/
│   ├── api/              # API routes
│   ├── admin/            # Faculty Admin pages
│   ├── officer/          # Departmental Officer pages
│   ├── lecturer/         # Lecturer pages
│   ├── course-rep/       # Course Rep pages
│   ├── auth/             # Authentication pages
│   └── dashboard/        # Dashboard redirect
├── components/           # React components
├── lib/
│   ├── prisma.ts         # Prisma client instance
│   ├── auth.ts           # NextAuth configuration
│   └── rbac.ts           # RBAC utilities
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seed script
└── types/                # TypeScript type definitions
```

## API Routes

- `/api/assets` - Asset CRUD operations
- `/api/requests` - Request management
- `/api/transfers` - Transfer management
- `/api/reports` - Report generation
- `/api/users` - User management
- `/api/auth/[...nextauth]` - Authentication

## Role Permissions

### Faculty Admin
- View all assets
- Approve in-department transfers
- Generate reports
- Manage users
- View all requests and transfers

### Departmental Officer
- Register new assets
- Approve requests
- Manage internal transfers
- View all assets in department

### Lecturer
- Request assets
- Return allocated assets
- View personal requests
- View personal allocations

### Course Rep
- View available consumables
- View available teaching aids

## Database Schema

The application uses Prisma with SQLite. Key models include:

- **User**: User accounts with roles
- **Asset**: Departmental assets
- **Request**: Asset requests from lecturers
- **Transfer**: Asset transfers between users
- **Approval**: Approval records for requests and transfers

## Development

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

## Production Deployment

1. Update `.env` with production values
2. Change `DATABASE_URL` to a production database (PostgreSQL recommended)
3. Update `NEXTAUTH_SECRET` to a secure random string
4. Build the application:
```bash
npm run build
```
5. Start the production server:
```bash
npm start
```

## Security Notes

- Change default passwords in production
- Use a strong `NEXTAUTH_SECRET` in production
- Consider using PostgreSQL for production
- Implement rate limiting for API routes
- Add input validation and sanitization
- Use HTTPS in production

## License

This project is licensed under the MIT License.
