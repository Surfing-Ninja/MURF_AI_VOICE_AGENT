# 🚀 Render Deployment Guide for क्रेता-बन्धु

This guide will help you deploy both the backend and frontend on Render.

## 📋 Prerequisites

- Render account ([Sign up](https://render.com))
- GitHub repository pushed to remote
- Gemini API key ([Get here](https://aistudio.google.com/app/apikey))
- Murf API key ([Get here](https://murf.ai/))

---

## 🗄️ Part 1: Deploy Backend (Database Server)

### Step 1: Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `MURF_AI_VOICE_AGENT`
4. Configure the service:

   ```
   Name: kreta-bandhu-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: server
   Environment: Node
   Build Command: npm install
   Start Command: node databaseServer.js
   ```

### Step 2: Configure Environment Variables

Add these in the **Environment** tab:

```
NODE_VERSION = 18.18.0
PORT = 3005
```

### Step 3: Add Persistent Disk (IMPORTANT for SQLite)

1. Go to **"Disks"** tab
2. Click **"Add Disk"**
3. Configure:
   ```
   Name: sqlite-data
   Mount Path: /opt/render/project/src/server
   Size: 1 GB (Free tier)
   ```

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (~3-5 minutes)
3. Once deployed, copy the backend URL: `https://kreta-bandhu-backend.onrender.com`

### Step 5: Test Backend

Visit: `https://your-backend-url.onrender.com/api/categories`

You should see the categories JSON response.

---

## ⚛️ Part 2: Deploy Frontend (React App)

### Step 1: Update Environment Variables Locally

Edit `Lumina Support/.env.production`:

```env
VITE_API_BASE_URL=https://your-backend-url.onrender.com
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_MURF_API_KEY=your_murf_api_key_here
```

### Step 2: Update API Calls in Frontend

Check if `AgentInterface.tsx` uses environment variables for API base URL.

If you see hardcoded `http://localhost:3005`, replace with:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';
```

### Step 3: Commit Changes

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### Step 4: Create Frontend Web Service

1. Go to Render Dashboard → **"New +"** → **"Static Site"**
2. Connect repository: `MURF_AI_VOICE_AGENT`
3. Configure:

   ```
   Name: kreta-bandhu-frontend
   Branch: main
   Root Directory: Lumina Support
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

### Step 5: Add Environment Variables

In **Environment** tab, add:

```
VITE_API_BASE_URL = https://your-backend-url.onrender.com
VITE_GEMINI_API_KEY = your_gemini_api_key
VITE_MURF_API_KEY = your_murf_api_key
```

### Step 6: Deploy

1. Click **"Create Static Site"**
2. Wait for build (~5-7 minutes)
3. Once deployed, your app will be live at: `https://kreta-bandhu-frontend.onrender.com`

---

## 🔧 Post-Deployment Configuration

### Update CORS on Backend

If you encounter CORS errors, update `server/databaseServer.js`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://kreta-bandhu-frontend.onrender.com'
  ],
  credentials: true
}));
```

Commit and push to trigger redeployment.

---

## 🐛 Troubleshooting

### Backend Issues

**Problem:** Database not persisting
- **Solution:** Ensure persistent disk is mounted at correct path

**Problem:** Port binding error
- **Solution:** Render automatically sets `PORT` env variable, update code:
  ```javascript
  const PORT = process.env.PORT || 3005;
  ```

**Problem:** SQLite file not found
- **Solution:** Check disk mount path matches code path

### Frontend Issues

**Problem:** API calls failing
- **Solution:** Check `VITE_API_BASE_URL` in environment variables

**Problem:** Environment variables not loading
- **Solution:** Ensure they're prefixed with `VITE_`

**Problem:** WebGL not working
- **Solution:** This is browser-dependent, not deployment issue

### General Issues

**Problem:** Build failing
- **Solution:** Check build logs, ensure all dependencies in `package.json`

**Problem:** Cold starts (slow first load)
- **Solution:** This is normal on free tier, consider upgrading

---

## 📊 Free Tier Limits

| Service | Limit |
|---------|-------|
| **Backend** | 750 hours/month, sleeps after 15 min inactivity |
| **Frontend** | Unlimited bandwidth (100 GB), always on |
| **Disk** | 1 GB persistent storage |
| **Build** | 500 build minutes/month |

---

## 🔄 Continuous Deployment

Render automatically redeploys when you push to the connected branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Render detects push and redeploys automatically
```

---

## 🌐 Custom Domain (Optional)

1. Go to **Settings** → **Custom Domains**
2. Add your domain: `kreta-bandhu.com`
3. Update DNS records as shown by Render
4. Wait for SSL certificate provisioning (~5 minutes)

---

## 📝 Environment Variables Reference

### Backend (.env)
```env
PORT=3005
NODE_VERSION=18.18.0
```

### Frontend (.env.production)
```env
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_GEMINI_API_KEY=your_key_here
VITE_MURF_API_KEY=your_key_here
```

---

## ✅ Deployment Checklist

- [ ] Backend deployed with persistent disk
- [ ] Backend URL copied
- [ ] Frontend environment variables updated
- [ ] Frontend deployed
- [ ] Test voice interaction
- [ ] Test cart functionality
- [ ] Test invoice generation
- [ ] Test all 19+ agent tools
- [ ] Verify WebGL orb rendering
- [ ] Check mobile responsiveness

---

## 🎉 Success!

Your क्रेता-बन्धु AI Voice Agent is now live!

**Backend:** `https://kreta-bandhu-backend.onrender.com`  
**Frontend:** `https://kreta-bandhu-frontend.onrender.com`

---

## 📞 Support

For deployment issues:
- Render Docs: https://render.com/docs
- GitHub Issues: https://github.com/Surfing-Ninja/MURF_AI_VOICE_AGENT/issues

**Built with ❤️ | Powered by Murf Falcon TTS**
