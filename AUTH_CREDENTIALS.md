# Authentication Credentials

## 🔐 Default Test Account Credentials

After running the database seed (`npm run db:seed`), you can log in with these default accounts:

### 👨‍💼 Faculty Admin

**Primary Account:**
- **Email**: `admin@university.edu`
- **Password**: `admin123`
- **Role**: Faculty Admin
- **Access**: Full system access, approves inter-departmental transfers, manages all users

**Additional Admin Account:**
- **Email**: `admin2@university.edu`
- **Password**: `admin123`
- **Role**: Faculty Admin

---

### 👔 Departmental Officer

**Primary Account:**
- **Email**: `officer@university.edu`
- **Password**: `officer123`
- **Role**: Departmental Officer
- **Department**: Computer Science
- **Access**: Register assets, approve requests, manage transfers, record maintenance

**Additional Officer Accounts:**
- **Email**: `officer2@university.edu` → **Password**: `officer123` (Mathematics)
- **Email**: `officer3@university.edu` → **Password**: `officer123` (Physics)
- **Email**: `officer4@university.edu` → **Password**: `officer123` (Chemistry)
- **Email**: `officer5@university.edu` → **Password**: `officer123` (Biology)

---

### 👨‍🏫 Lecturer

**Primary Account:**
- **Email**: `lecturer@university.edu`
- **Password**: `lecturer123`
- **Role**: Lecturer
- **Department**: Computer Science
- **Access**: Request assets, return assets, view personal allocations

**Additional Lecturer Accounts:**
- **Email**: `lecturer2@university.edu` → **Password**: `lecturer123` (Mathematics)
- **Email**: `lecturer3@university.edu` → **Password**: `lecturer123` (Physics)
- **Email**: `lecturer4@university.edu` → **Password**: `lecturer123` (Chemistry)
- **Email**: `lecturer5@university.edu` → **Password**: `lecturer123` (Biology)
- **Email**: `lecturer6@university.edu` → **Password**: `lecturer123` (Engineering)
- **Email**: `lecturer7@university.edu` → **Password**: `lecturer123` (Business)
- **Email**: `lecturer8@university.edu` → **Password**: `lecturer123` (Arts)

---

### 👨‍🎓 Course Representative

**Primary Account:**
- **Email**: `rep@university.edu`
- **Password**: `rep123`
- **Role**: Course Rep
- **Department**: Computer Science
- **Access**: View available consumables and teaching aids

**Additional Course Rep Accounts:**
- **Email**: `rep2@university.edu` → **Password**: `rep123` (Mathematics)
- **Email**: `rep3@university.edu` → **Password**: `rep123` (Physics)
- **Email**: `rep4@university.edu` → **Password**: `rep123` (Chemistry)
- **Email**: `rep5@university.edu` → **Password**: `rep123` (Biology)

---

## 📋 Quick Reference Table

| Role | Email | Password | Count |
|------|-------|----------|-------|
| **Faculty Admin** | `admin@university.edu` | `admin123` | 2 accounts |
| **Departmental Officer** | `officer@university.edu` | `officer123` | 5 accounts |
| **Lecturer** | `lecturer@university.edu` | `lecturer123` | 8 accounts |
| **Course Rep** | `rep@university.edu` | `rep123` | 5 accounts |

---

## 🔑 Password Summary

All seeded accounts use simple passwords for testing:

- **Faculty Admin**: `admin123`
- **Departmental Officer**: `officer123`
- **Lecturer**: `lecturer123`
- **Course Rep**: `rep123`

---

## ⚠️ Security Warning

**IMPORTANT**: These are default test credentials. **You MUST change all passwords in production!**

### To Change Passwords:

1. **Via Database** (Direct):
   ```sql
   UPDATE User SET password = '<hashed_password>' WHERE email = 'admin@university.edu';
   ```

2. **Via Application** (Recommended):
   - Log in as the user
   - Navigate to profile/settings (if implemented)
   - Change password through the UI

3. **Via Seed Script**:
   - Modify `prisma/seed.ts`
   - Change the password hashes
   - Re-run seed (⚠️ This will delete existing data)

### Generate Secure Password Hash:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-new-password', 10).then(console.log)"
```

---

## 🧪 Testing Different Roles

To test the full system functionality:

1. **Start with Faculty Admin** (`admin@university.edu`)
   - View all assets, users, and system-wide reports
   - Approve inter-departmental transfers

2. **Switch to Departmental Officer** (`officer@university.edu`)
   - Register new assets
   - Approve/reject requests
   - Manage transfers

3. **Test as Lecturer** (`lecturer@university.edu`)
   - Request assets
   - View personal allocations
   - Return assets

4. **Check Course Rep** (`rep@university.edu`)
   - View available consumables
   - View teaching aids

---

## 📝 Notes

- All passwords are hashed using `bcryptjs` with 10 salt rounds
- Email addresses follow the pattern: `{role}@university.edu` or `{role}{number}@university.edu`
- Departments are randomly assigned from: Computer Science, Mathematics, Physics, Chemistry, Biology, Engineering, Business, Arts
- Employee IDs follow the pattern: `{ROLE}{NUMBER}` (e.g., `ADM001`, `OFF001`, `LEC001`, `REP001`)

---

**For Production**: Always use strong, unique passwords and implement password reset functionality!

