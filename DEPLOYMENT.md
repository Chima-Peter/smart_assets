# Vercel Deployment Guide

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket Account**: Your code should be in a Git repository
3. **Database**: Vercel doesn't support SQLite file databases. You'll need to use:
   - **PostgreSQL** (Recommended): Use Vercel Postgres, Supabase, or Neon
   - **MySQL**: Use PlanetScale or Railway
   - **SQLite**: Use Turso (libSQL) for serverless SQLite

## 🚀 Deployment Steps

### Step 1: Prepare Your Database

Since Vercel uses serverless functions, you cannot use a local SQLite file. Choose one:

#### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Create Database** → **Postgres**
3. Copy the connection string

#### Option B: Supabase (Free tier available)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings** → **Database** → **Connection string**
4. Copy the connection string (use the "URI" format)

#### Option C: Turso (for SQLite)
1. Sign up at [turso.tech](https://turso.tech)
2. Create a database
3. Copy the connection string

### Step 2: Update Prisma Schema (if using PostgreSQL)

If you're using PostgreSQL, update your `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
npx prisma generate
npx prisma db push
```

### Step 3: Push Your Code to Git

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 4: Deploy to Vercel

#### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
vercel
```

4. **Follow the prompts:**
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No**
   - Project name? (Enter your project name)
   - Directory? (Press Enter for current directory)
   - Override settings? **No**

5. **For production deployment:**
```bash
vercel --prod
```

#### Method 2: Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure project settings (see Step 5)

### Step 5: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

#### Required Variables:

```
DATABASE_URL=your_database_connection_string
NEXTAUTH_SECRET=your_random_secret_key_min_32_chars
NEXTAUTH_URL=https://your-project.vercel.app
```

#### Generate NEXTAUTH_SECRET:

You can generate a secure secret using:
```bash
openssl rand -base64 32
```

Or use an online generator: [generate-secret.vercel.app](https://generate-secret.vercel.app/32)

#### Example Environment Variables:

```
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
NEXTAUTH_SECRET=your-super-secret-key-minimum-32-characters-long
NEXTAUTH_URL=https://smart-assets.vercel.app
```

**Important**: 
- Add these for **Production**, **Preview**, and **Development** environments
- Click **Save** after adding each variable

### Step 6: Configure Build Settings

In Vercel project settings:

1. Go to **Settings** → **General**
2. **Build & Development Settings**:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

3. **Root Directory**: Leave empty (unless your Next.js app is in a subdirectory)

### Step 7: Run Database Migrations

After deployment, you need to seed your database:

#### Option 1: Using Vercel CLI

```bash
vercel env pull .env.local
npx prisma db push
npm run db:seed
```

#### Option 2: Using Vercel Functions

Create a one-time migration script or use Vercel's CLI to run commands:

```bash
vercel exec -- npm run db:push
vercel exec -- npm run db:seed
```

#### Option 3: Manual Setup

1. Connect to your database directly
2. Run migrations:
```bash
npx prisma migrate deploy
```
3. Run seed:
```bash
npm run db:seed
```

### Step 8: Verify Deployment

1. Visit your deployment URL: `https://your-project.vercel.app`
2. Test login with the default credentials (see Authentication Credentials below)
3. Verify all features are working

## 🔧 Post-Deployment Configuration

### Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXTAUTH_URL` environment variable to match your domain

### Database Connection Pooling

For PostgreSQL, consider using a connection pooler:
- **Supabase**: Built-in connection pooling
- **Neon**: Built-in connection pooling
- **Vercel Postgres**: Automatic connection pooling

### Monitoring

1. Set up **Vercel Analytics** (optional)
2. Monitor **Function Logs** in Vercel dashboard
3. Set up error tracking (Sentry, etc.)

## 🔄 Updating Your Deployment

After making changes:

```bash
git add .
git commit -m "Update features"
git push origin main
```

Vercel will automatically:
- Detect the push
- Build your application
- Deploy to preview
- Deploy to production (if on main branch)

## 🐛 Troubleshooting

### Build Errors

1. **Check build logs** in Vercel dashboard
2. **Verify environment variables** are set correctly
3. **Check Prisma client generation**: Ensure `prisma generate` runs in build

### Database Connection Issues

1. **Verify DATABASE_URL** is correct
2. **Check database credentials** and permissions
3. **Ensure database allows connections** from Vercel IPs
4. **For PostgreSQL**: Use SSL connection string

### Authentication Issues

1. **Verify NEXTAUTH_SECRET** is set and at least 32 characters
2. **Check NEXTAUTH_URL** matches your deployment URL
3. **Clear browser cookies** and try again

### Function Timeout

1. **Increase function timeout** in Vercel settings (max 60s for Hobby, 300s for Pro)
2. **Optimize database queries**
3. **Use edge functions** where possible

## 📝 Additional Notes

- **File Uploads**: Vercel has a 4.5MB limit for serverless functions. Consider using:
  - Vercel Blob Storage
  - AWS S3
  - Cloudinary
  - Upload to database as base64 (small files only)

- **SQLite on Vercel**: Not recommended. Use Turso (libSQL) if you need SQLite compatibility.

- **Environment Variables**: Never commit `.env` files. Always use Vercel's environment variables.

- **Database Backups**: Set up automatic backups for your production database.

## 🔐 Security Checklist

- [ ] Changed default passwords
- [ ] Set strong NEXTAUTH_SECRET (32+ characters)
- [ ] Using HTTPS (automatic on Vercel)
- [ ] Database credentials are secure
- [ ] Environment variables are not exposed
- [ ] Database allows connections only from Vercel
- [ ] Regular security updates

---

**Need Help?** Check Vercel's documentation: [vercel.com/docs](https://vercel.com/docs)

