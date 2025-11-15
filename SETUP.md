# 🔧 SETUP INSTRUCTIONS - AMBUCLEAR

## ⚠️ IMPORTANT: Node.js Required

Before you can run the AMBUCLEAR application, you need to install Node.js.

## Step 1: Install Node.js

### Windows Installation:

1. **Download Node.js:**
   - Go to: https://nodejs.org/
   - Download the **LTS version** (recommended) - currently 20.x or 18.x
   - Choose "Windows Installer (.msi)" - 64-bit

2. **Run the installer:**
   - Double-click the downloaded `.msi` file
   - Click "Next" through the installation wizard
   - Accept the license agreement
   - Keep default installation path: `C:\Program Files\nodejs\`
   - **IMPORTANT**: Make sure "Add to PATH" is checked ✓
   - Click "Install"
   - Click "Finish"

3. **Verify installation:**
   - Open a **NEW** PowerShell window
   - Run these commands:
   ```powershell
   node --version
   # Should show: v20.x.x or v18.x.x
   
   npm --version
   # Should show: 10.x.x or 9.x.x
   ```

## Step 2: Install Project Dependencies

Once Node.js is installed:

```powershell
# Navigate to project directory
cd c:\Users\diva1\Desktop\ambulance-sim\ev-assist

# Install all dependencies
npm install
```

This will install:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- xlsx (Excel storage)
- Pusher (WebSocket)
- OpenAI SDK
- And all other required packages

**Installation may take 2-5 minutes depending on your internet speed.**

## Step 3: Configure Environment (Optional)

The app will work without API keys, but with limited features.

Edit `.env.local` to add:
```env
# Optional - For Google Maps integration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here

# Optional - For AI voice instructions
OPENAI_API_KEY=your_key_here

# Optional - For real-time WebSocket
NEXT_PUBLIC_PUSHER_KEY=your_key_here
PUSHER_APP_ID=your_id_here
PUSHER_SECRET=your_secret_here
```

## Step 4: Start Development Server

```powershell
npm run dev
```

The application will be available at: **http://localhost:3000**

## Step 5: Open in Browser

1. Open your browser (Chrome, Edge, Firefox)
2. Go to: `http://localhost:3000`
3. You should see the AMBUCLEAR home page with three options:
   - 🚑 Ambulance Driver
   - 🚗 Public Driver
   - 🎛️ Control Room

## 🎯 Quick Test

1. Click "Ambulance Driver"
2. Register with any test data
3. Login to dashboard
4. Enable GPS permission when prompted
5. Set status to 🔴 RED

## 🚀 Alternative: Use Installation Script

If you prefer automated setup (after installing Node.js):

```powershell
cd c:\Users\diva1\Desktop\ambulance-sim\ev-assist
.\install.ps1
```

This will:
- Check prerequisites
- Install dependencies
- Configure environment
- Start dev server

## 📁 Project Structure

```
ev-assist/
├── app/                  # Next.js pages
├── lib/                  # Core utilities
├── components/           # Reusable components
├── public/               # Static files
├── data/                 # Excel database (auto-created)
├── package.json          # Dependencies
├── .env.local           # Environment variables
└── README.md            # Full documentation
```

## 🔍 Troubleshooting

### "node is not recognized"
**Solution:** Node.js not installed or not in PATH
- Install Node.js from nodejs.org
- Restart PowerShell after installation
- Make sure "Add to PATH" was checked during installation

### "npm install fails"
**Solution:** 
- Check internet connection
- Try running PowerShell as Administrator
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and try again

### "Port 3000 already in use"
**Solution:**
```powershell
# Kill process on port 3000
npx kill-port 3000

# Or use different port
npm run dev -- -p 3001
```

### "Permission denied"
**Solution:**
- Run PowerShell as Administrator
- Or change execution policy: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

## 📚 Documentation Files

- **README.md** - Complete project documentation
- **QUICKSTART.md** - Quick start guide
- **PROJECT_SUMMARY.md** - Full feature list and deliverables
- **SETUP.md** - This file

## ✅ Installation Checklist

- [ ] Node.js 18+ installed
- [ ] npm working in PowerShell
- [ ] Project dependencies installed (`npm install`)
- [ ] Environment configured (`.env.local`)
- [ ] Dev server running (`npm run dev`)
- [ ] App accessible at localhost:3000
- [ ] GPS permission granted in browser

## 🎓 Learning Resources

- **Next.js Docs:** https://nextjs.org/docs
- **React Docs:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs

## 🆘 Need Help?

If you encounter any issues:

1. Check this SETUP.md file
2. Review QUICKSTART.md
3. Check browser console for errors (F12)
4. Verify Node.js installation: `node --version`
5. Ensure all dependencies installed: Check for `node_modules/` folder

## 🎉 Next Steps After Setup

1. **Test all three user roles:**
   - Ambulance Driver
   - Public Driver
   - Control Room

2. **Try the simulation script:**
   - Open browser console (F12)
   - Load `/simulator.js`
   - Run test functions

3. **Deploy to Vercel:**
   - Push code to GitHub
   - Connect to Vercel
   - Add environment variables
   - Deploy!

4. **Customize the app:**
   - Update hospital list
   - Change alert radius
   - Modify UI colors
   - Add more features

## 🚀 Production Deployment

Once tested locally, deploy to Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

Your app will be live at a `.vercel.app` URL!

---

**🚑 Ready to save lives with AMBUCLEAR! 🚑**

For detailed documentation, see **README.md**
