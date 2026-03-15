# Quick Start Guide - Authentication Setup

## 🎯 What Was Added

### New Authentication System
✅ **Login Page** - Sign in as Admin or Faculty
✅ **Auth Registration Hub** - Choose role before registration  
✅ **Admin Registration** - Email + Face Authentication
✅ **Faculty Registration** - Email + Phone + Subjects
✅ **Protected Routes** - Only authenticated users can access features
✅ **Auth Context** - Global authentication state management

---

## 📝 Test Accounts (Development)

After running the app, you can test with these credentials:

### Admin Account
```
Email: demo@admin.com
Password: Any password (demo setup)
```

### Faculty Account  
```
Email: demo@faculty.com
Password: Any password (demo setup)
Subjects: Mathematics, Physics
```

---

## 🚀 Getting Started

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Access the Application
```
Navigate to: http://localhost:5173
```

### 3. Login Flow
```
Home Page (redirects to login if not authenticated)
    ↓
Choose Login or Register
    ↓
If Login: Enter email/password → Redirected to Home
    ↓
If Register: Select Role → Fill Details → Create Account → Home
```

---

## 📱 Pages & Routes

| Page | Route | Role | Purpose |
|------|-------|------|---------|
| Login | `/auth/login` | Any | Sign in to account |
| Register Hub | `/auth/register` | Any | Choose registration type |
| Admin Register | `/auth/register/admin` | New Admin | Create admin account with face |
| Faculty Register | `/auth/register/faculty` | New Faculty | Create faculty account |
| Home/Dashboard | `/` | All | Main dashboard |
| Register Students | `/register` | Faculty & Admin | Register student faces (now a dedicated page) |
| Mark Attendance | `/attendance` | Faculty | Take real-time attendance |
| View Records | `/records` | Faculty | See attendance & fines |

---

## 🔐 How Authentication Works

### 1. **Registration Process**

**Admin Registration:**
```
1. Enter Email & Password
2. Enter Full Name
3. Capture Face Photo (for authentication)
4. Account Created
5. Automatically Logged In
```

**Faculty Registration:**
```
1. Enter Email & Password  
2. Enter Name & Phone Number
3. Select Subjects (minimum 1)
4. Account Created
5. Automatically Logged In
```

### 2. **Login Process**
```
1. Enter Email & Password
2. Select Role (Admin or Faculty)
3. System Verifies Credentials
4. Creates Session Token
5. Redirects to Home (Protected)
```

### 3. **Protected Routes**
```
- All pages require authentication
- Unauthorized users directed to login
- Role-specific access (Faculty pages hidden from Admins)
- Session persists across page reloads
```

---

## 👤 User Menu

Click on your profile in the navbar to see:
- **Your Name**
- **Email Address**  
- **Current Role** (Admin/Faculty)
- **Sign Out Button**

---

## 🔄 Data Persistence

### Current Level (Development)
- Data stored in **browser localStorage**
- Persists across browser sessions
- Lost when localStorage is cleared

### Production (Supabase)
- Data stored in **PostgreSQL database**
- Secure encrypted storage
- Real-time synchronization
- Automatic backups
- Learn more: See `SYSTEM_ARCHITECTURE.md`

---

## ⚙️ Configuration

### Environment Variables (.env.local)
```
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
```

### Browser Permissions Required
- ✅ Camera Access (for face registration)
- (Optional) Microphone (future features)

---

## 🐛 Troubleshooting

### "Camera not accessible"
```
Solution: 
1. Check browser camera permissions
2. Clear site data and reload
3. Try different browser
```

### "Face detection failed"
```
Solution:
1. Ensure good lighting
2. Face is clearly visible
3. No glasses/heavy makeup
4. Try from 30-60cm away
```

### "Face not captured"
```
Solution:
1. Allow camera access
2. Check browser console for errors
3. Use Chrome/Firefox for best compatibility
```

### "localStorage full"
```
Solution:
1. Clear browser cache
2. Delete old test data
3. Switch to cloud database (Supabase)
```

---

## 📚 File Structure for New Features

```
src/
├── utils/authService.ts          ← Authentication logic
├── contexts/AuthContext.tsx       ← Auth state (global)
├── pages/
│   ├── Login.tsx                 ← Login page
│   ├── AuthRegister.tsx          ← Role selection
│   ├── AdminRegister.tsx         ← Admin registration
│   ├── FacultyRegister.tsx       ← Faculty registration
│   └── Register.tsx              ← Student face registration page
└── components/
    └── Navbar.tsx                ← Updated with user menu
```

---

## 🎨 UI/UX Features

### Login Page
- Role selection (Admin/Faculty tabs)
- Email & password inputs  
- Show/hide password toggle
- Email validation
- Loading state with spinner
- Error message display
- Demo credentials hint

### Registration Pages
- Step-by-step form
- Real-time validation
- Accessible form inputs
- Password confirmation
- Subject selection (dropdown)
- Face capture preview
- Success/error feedback
- Back button to previous page

### User Menu
- Profile info display
- Role badge
- Logout button
- Smooth animations
- Click-outside to close

---

## 🔗 Integration with Existing Features

### Already Works With:
✅ **Face Registration** (Register.tsx)
✅ **Attendance Marking** (Attendance.tsx)  
✅ **Records Management** (Records.tsx)
✅ **WhatsApp Integration** (whatsappService.ts)
✅ **Fine Management** (fineUtils.ts)

### What Gets Protected:
✅ All existing pages require login
✅ Faculty-only pages check role
✅ Session saved to localStorage
✅ Auto-logout on role change

---

## 📈 Performance Optimizations

- ✅ Code splitting by route
- ✅ Lazy loading of pages
- ✅ Memoized auth checks
- ✅ Optimized context updates
- ✅ Minimal re-renders

---

## 🚀 Ready for Production?

To deploy to production:

1. **Set up Supabase Account**
   - Create project at supabase.com
   - Get API credentials
   - Set environment variables

2. **Replace Auth Service**
   - Update `authService.ts` with Supabase client
   - Set up database tables (see SYSTEM_ARCHITECTURE.md)
   - Configure Row-Level Security

3. **Deployment**
   - Build: `npm run build`
   - Deploy to Vercel/Netlify/AWS

---

## 💡 Tips & Tricks

1. **Test Multiple Roles**
   - Open in incognito for different user
   - Or use browser dev tools to clear storage

2. **Check Auth State**
   - Open browser console
   - `localStorage.getItem('auth_user')` to see current user

3. **Demo Data**
   - Create test accounts and use them
   - Data resets when localStorage is cleared

4. **Face Photos**
   - Store as base64 in localStorage (temp)
   - Upload to cloud storage in production (Supabase)

---

## 📞 Need Help?

1. Check `SYSTEM_ARCHITECTURE.md` for detailed info
2. Review code comments in files
3. Check browser console for error messages
4. Ensure browser allows camera access

---

**Happy Testing! 🎉**
