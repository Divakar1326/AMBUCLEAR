# 🚀 Quick Start Guide

Get AMBUCLEAR running in 5 minutes!

## Prerequisites Check

Before starting, ensure you have:
- ✓ Node.js 18 or higher installed
- ✓ npm or yarn package manager
- ✓ A code editor (VS Code recommended)
- ✓ (Optional) Google Maps API key

## Step-by-Step Installation

### 1. Navigate to Project Directory

```bash
cd ev-assist
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- xlsx (for Excel storage)
- Pusher (WebSocket)
- OpenAI (AI instructions)

### 3. Configure Environment

Copy the `.env.local` file and add your API keys:

```env
# Minimum configuration (app will work without these)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here

# Optional - AI voice instructions (falls back to rule-based)
OPENAI_API_KEY=your_key_here

# Optional - Real-time WebSocket (can work without)
NEXT_PUBLIC_PUSHER_KEY=your_key_here
PUSHER_APP_ID=your_id_here
PUSHER_SECRET=your_secret_here
```

**Note:** The app will work even without API keys, but with limited features.

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

### 5. Test the Application

#### Test as Ambulance Driver:
1. Go to `http://localhost:3000`
2. Click "Ambulance Driver"
3. Register with sample data
4. Login and access dashboard
5. Enable GPS permission
6. Set status to 🔴 RED

#### Test as Public Driver:
1. Open in another browser tab/window
2. Go to `http://localhost:3000`
3. Click "Public Driver"
4. Enable GPS permission
5. Keep the page open

#### Test as Control Room:
1. Go to `http://localhost:3000/control`
2. Login with password: `admin123`
3. Monitor all active ambulances

### 6. Run Test Simulation

To test the alert system without actual GPS movement:

1. Open browser console (F12)
2. Load the simulator script:
   ```javascript
   // Load simulator
   const script = document.createElement('script');
   script.src = '/simulator.js';
   document.head.appendChild(script);
   ```

3. Run tests:
   ```javascript
   // Create test ambulance
   const id = await ambulanceSimulator.createTestAmbulance();
   
   // Run all automated tests
   ambulanceSimulator.runAllTests();
   
   // Or simulate movement
   ambulanceSimulator.simulateAmbulanceMovement(id, 30000);
   ```

## Common Issues & Solutions

### Issue: "GPS not working"
**Solution:** Ensure you're using HTTPS or localhost. Geolocation API requires secure context.

### Issue: "Cannot find module errors"
**Solution:** 
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Excel file errors"
**Solution:** Check that the `data/` directory has write permissions.

### Issue: "TypeScript errors"
**Solution:** The app will still run. These are expected in development due to missing dependencies installation. Run `npm install` to resolve.

### Issue: "Port 3000 already in use"
**Solution:** 
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
npm run dev -- -p 3001
```

## Production Build

To test production build locally:

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Deploy to Vercel

### Quick Deploy:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

Follow the prompts to deploy. Your app will be live in minutes!

### Manual Deploy:

1. Push code to GitHub
2. Go to https://vercel.com
3. Click "New Project"
4. Import your repository
5. Add environment variables
6. Deploy!

## Next Steps

1. **Customize hospitals list** in `/api/hospitals/route.ts`
2. **Update alert radius** in `.env.local` (default 500m)
3. **Change control room password** in `.env.local`
4. **Add Google Maps** integration for visual tracking
5. **Enable push notifications** for background alerts

## Getting API Keys

### Google Maps API Key:
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable "Maps JavaScript API"
4. Create credentials → API Key
5. Add to `.env.local`

### OpenAI API Key:
1. Go to https://platform.openai.com
2. Sign up / Login
3. Go to API Keys
4. Create new key
5. Add to `.env.local`

### Pusher (WebSocket):
1. Go to https://pusher.com
2. Sign up for free account
3. Create new app
4. Copy credentials
5. Add to `.env.local`

## Development Tips

- **Hot Reload**: Changes auto-refresh in dev mode
- **Console Logs**: Check browser console for errors
- **API Testing**: Use Postman or Thunder Client
- **Database**: Excel file in `data/ambuclear_data.xlsx`
- **Styles**: Tailwind CSS classes work everywhere

## Support

If you encounter issues:
1. Check the README.md for detailed documentation
2. Review the console for error messages
3. Ensure all dependencies are installed
4. Verify environment variables are set

## Success Checklist

- ✓ Dependencies installed (`npm install`)
- ✓ Environment configured (`.env.local`)
- ✓ Dev server running (`npm run dev`)
- ✓ App opens at localhost:3000
- ✓ GPS permission granted
- ✓ Alert system tested
- ✓ All three user roles accessible

**You're ready to save lives! 🚑💨**
