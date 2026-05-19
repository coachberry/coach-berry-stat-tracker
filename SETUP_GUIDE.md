# Hockey Stats Tracker - Setup & Deployment Guide

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm
- GitHub account
- Firebase project (`coach-berry-stat-tracker`)

## 🚀 Local Setup

### 1. File Structure
Place all files in your React project:
```
coach-berry-stat-tracker/
├── src/
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── Login.css
│   │   ├── StatsEntry.jsx
│   │   ├── StatsEntry.css
│   │   ├── StatisticsPage.jsx
│   │   ├── StatisticsPage.css
│   │   ├── StatLeaders.jsx
│   │   ├── StatLeaders.css
│   │   ├── AdminDashboard.jsx
│   │   └── AdminDashboard.css
│   ├── firebaseConfig.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
```

### 2. Install Dependencies
```bash
npm install firebase
```

### 3. Update Main Entry Point
Replace your `src/main.jsx` with:
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 4. Create `src/index.css`
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
```

### 5. Test Locally
```bash
npm run dev
```
Visit `http://localhost:5173/`

## 🔒 Firebase Setup

### 1. Configure Firestore Security Rules
Go to Firebase Console → Firestore → Rules, replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.uid != null;
    }
    
    // Team stats - all authenticated users can read
    match /teamStats/{document=**} {
      allow read: if request.auth.uid != null;
      allow create, write: if request.auth.uid != null;
      allow delete: if request.auth.uid != null;
    }
  }
}
```

### 2. Create Firestore Collections
The app will automatically create collections on first use. Manual setup (optional):
- Create collection: `users`
- Create collection: `teamStats`

### 3. Authentication
Your email/password authentication is already enabled. No additional setup needed.

## 📤 Deployment to GitHub Pages

### 1. Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit: Hockey Stats Tracker"
git branch -M main
git remote add origin https://github.com/coachberry/coach-berry-stat-tracker.git
git push -u origin main
```

### 2. Add Deploy Configuration
Update `vite.config.js`:
```javascript
export default {
  base: '/coach-berry-stat-tracker/', // Use '/' if deploying to root
}
```

### 3. Deploy Script
Add to `package.json` scripts:
```json
"deploy": "npm run build && git add dist && git commit -m 'Deploy' && git subtree push --prefix dist origin gh-pages"
```

### 4. Build and Deploy
```bash
npm run build
npm run deploy
```

### 5. Enable GitHub Pages
- Go to GitHub repo Settings → Pages
- Source: `gh-pages` branch
- Your site will be live at: `https://coachberry.github.io/coach-berry-stat-tracker/`

## 🔗 Embed in Wix

### 1. Get Embed Code
In Wix Editor:
1. Click "Add Elements" → "Embed" → "Custom Embed"
2. Add this code:
```html
<iframe 
  src="https://coachberry.github.io/coach-berry-stat-tracker/" 
  width="100%" 
  height="800px" 
  style="border: none; border-radius: 8px;"
></iframe>
```

### 2. Customize Size
Adjust `height` value as needed. For fullscreen, use:
```html
<iframe 
  src="https://coachberry.github.io/coach-berry-stat-tracker/" 
  width="100%" 
  height="100vh" 
  style="border: none;"
></iframe>
```

## 👥 Managing Users

### As Admin:
1. Login with your admin account
2. Go to "Admin Dashboard"
3. Create new user accounts
4. Promote coaches to admin status as needed

### First Time Setup:
1. Sign up as the first user (you become admin automatically)
2. Create other coach accounts

## 🐛 Troubleshooting

**Issue: "Firebase connection error"**
- Check Firebase credentials in `firebaseConfig.js`
- Ensure Firestore is enabled in Firebase Console

**Issue: "Deployment not showing updates"**
- Clear browser cache
- Ensure `npm run build` completes without errors
- Check GitHub Pages settings are pointing to `gh-pages` branch

**Issue: "Embed not loading in Wix"**
- Check browser console for CORS errors
- Ensure GitHub Pages URL is correct
- Try embedding in a custom code block instead of Element

## 📱 Features

✅ Coach authentication (login/signup)
✅ Admin dashboard (manage user accounts)
✅ Game stats entry (comprehensive form)
✅ Statistics tracking (by season and game type)
✅ Filtering and sorting
✅ Stat leaders (Top 10 by season, Top 20 all-time)
✅ Firestore sync
✅ Mobile responsive

## 🔄 Future Enhancements

- Individual player stats
- Season comparisons
- CSV export
- Advanced analytics
- Multi-team support (SaaS version)

## 📞 Support

For issues or questions, check:
- Firebase Console for data/authentication issues
- Browser console for JavaScript errors
- GitHub repository for code updates
