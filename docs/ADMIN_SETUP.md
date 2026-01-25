# Admin Account Setup Guide

This guide explains how to create an admin account for the Arabic Journalist CMS.

## Overview

Since there is only one admin account for this CMS, the admin account must be created directly in the database. There is no public registration or setup page for security reasons.

## Methods to Create Admin Account

### Method 1: Using Prisma Studio (Recommended for Development)

Prisma Studio is a GUI tool that lets you view and edit data in your database.

1. **Open Prisma Studio:**
   ```bash
   npx prisma studio
   ```

2. **Open your browser:**
   Prisma Studio typically opens at `http://localhost:5555`

3. **Navigate to the User model:**
   - Click on "User" in the left sidebar

4. **Add new record:**
   - Click "Add record" button
   - Fill in the fields:
     - `email`: Your admin email (e.g., `admin@example.com`)
     - `password`: **Will be generated as a hash** - see Method 2 below
     - `name`: Your display name (e.g., `Admin User`)
     - `emailVerified`: Set to `true`
     - `image`: Leave empty or add a profile picture URL

5. **Save the record**

**Important:** The password field requires a bcrypt hash. Use Method 2 to generate the proper hashed password.

---

### Method 2: Using Database Seed Script (Recommended)

Use the provided seed script to create an admin account with a properly hashed password.

1. **Create a seed script** (if not exists):
   ```bash
   npm install -D ts-node
   ```

2. **Create the seed file at `prisma/seed.ts`:**

   ```typescript
   import { PrismaClient } from '@prisma/client';
   import * as bcrypt from 'bcryptjs';

   const prisma = new PrismaClient();

   async function main() {
     // Hash the password
     const password = 'your-secure-password-here';
     const hashedPassword = await bcrypt.hash(password, 12);

     // Create admin user
     const admin = await prisma.user.upsert({
       where: { email: 'admin@example.com' },
       update: {},
       create: {
         email: 'admin@example.com',
         password: hashedPassword,
         name: 'Admin User',
         emailVerified: true,
       },
     });

     console.log('Admin account created:', admin.email);
   }

   main()
     .then(async () => {
       await prisma.$disconnect();
     })
     .catch(async (e) => {
       console.error(e);
       await prisma.$disconnect();
       process.exit(1);
     });
   ```

3. **Add seed script to package.json:**
   ```json
   {
     "prisma": {
       "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
     }
   }
   ```

4. **Run the seed script:**
   ```bash
   npx prisma db seed
   ```

5. **Login to your admin panel:**
   - Go to `/admin/login`
   - Enter your email and password

---

### Method 3: Using SQL Commands (Production Database)

If you have direct access to your PostgreSQL database (e.g., via Neon console):

1. **Generate a bcrypt hash** using an online tool or Node.js:
   ```javascript
   // Run this in Node.js to generate hash
   const bcrypt = require('bcryptjs');
   const hash = bcrypt.hashSync('your-password', 12);
   console.log(hash);
   ```

2. **Insert the user via SQL:**
   ```sql
   INSERT INTO "User" (
     id,
     email,
     password,
     name,
     "emailVerified",
     "createdAt",
     "updatedAt"
   ) VALUES (
     gen_random_uuid(),
     'admin@example.com',
     '$2a$12$your-hashed-password-here',
     'Admin User',
     true,
     NOW(),
     NOW()
   );
   ```

---

## Admin Account Requirements

| Field | Requirement | Notes |
|-------|-------------|-------|
| `email` | Valid email format | Used for login |
| `password` | Min 8 characters | Will be hashed with bcrypt (12 rounds) |
| `name` | Any text | Display name in dashboard |
| `emailVerified` | Must be `true` | Auto-verified for single admin setup |

---

## Password Security

- Passwords are hashed using **bcrypt** with **12 salt rounds**
- Never store plain text passwords
- The hash format: `$2a$12$...`
- Example hash for `password123`:
  ```
  $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyWui3QFxQLq
  ```

---

## Changing Admin Password

### Via Prisma Studio

1. Open Prisma Studio
2. Find your User record
3. Generate a new bcrypt hash (use the Node.js script above)
4. Paste the new hash into the `password` field
5. Save

### Via Seed Script

Modify the seed script with the new email/password and run it again.

---

## Resetting Admin Access

If you forget your password, you can create a new admin account or update the existing one using the methods above.

**Warning:** Creating multiple admin accounts is not recommended. Update the existing admin user instead.

---

## Testing Login Throttling

The CMS includes login attempt throttling for security:

- **Max attempts:** 5 failed attempts
- **Lockout duration:** 15 minutes
- **Tracking:** Both by email and IP address

To test throttling:
1. Attempt to login with wrong credentials 5 times
2. On the 6th attempt, you'll receive a lockout message
3. Wait 15 minutes or manually clear the `LoginAttempt` table

To clear login attempts:
```bash
npx prisma studio
# Then open LoginAttempt model and delete all records
```

---

## Security Checklist

- [ ] Use a strong password (min 12 characters, mixed case, numbers, symbols)
- [ ] Don't share admin credentials
- [ ] Enable HTTPS in production
- [ ] Keep dependencies updated
- [ ] Monitor failed login attempts
- [ ] Backup your database regularly

---

## Troubleshooting

### "Invalid credentials" error

- Verify email is correct
- Reset password using the methods above
- Check for extra spaces in email field

### "Too many attempts" error

- Wait 15 minutes for lockout to expire
- Clear login attempts from database:
  ```sql
  DELETE FROM "LoginAttempt";
  ```

### Can't access admin panel

- Verify `/admin/login` route exists
- Check middleware isn't blocking access
- Ensure session cookie is being set correctly

---

## Next Steps

After creating your admin account:

1. Login at `/admin/login`
2. Change your password if needed
3. Configure your site settings
4. Create your first article

---

**Last Updated:** Phase 2 - Authentication System
