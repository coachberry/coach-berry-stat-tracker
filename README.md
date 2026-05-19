# 🏒 Hockey Stats Tracker

A comprehensive team statistics tracking application built with React and Firebase. Perfect for high school hockey teams to record game stats, view season statistics, and identify stat leaders.

## Features

- **Authentication**: Secure login system for coaches
- **Admin Dashboard**: Create user accounts and manage permissions
- **Stats Entry**: Easy form to log game statistics
  - Game type (Exhibition, GNASH League, Preds Cup, Hine Cup)
  - Season tracking
  - Comprehensive stat categories:
    - Game results (W-L-T, OT W-L)
    - Scoring (GF, GA, Goal Differential)
    - Shots (On Goal, Against, Shooting %)
    - Special Teams (PP %, PK %)
    - Penalties
- **Statistics Page**: View all recorded stats with filtering and sorting
- **Stat Leaders**: See top performers by season and all-time
- **Real-time Sync**: All data synced to Firebase Firestore
- **Mobile Responsive**: Works great on phones and tablets

## Quick Start

### Prerequisites
- Node.js v16+
- npm
- Firebase project account

### Installation

1. **Copy all files to your React project** (created with `npm create vite@latest . -- --template react`)

2. **Install Firebase**
   ```bash
   npm install firebase
   ```

3. **Update Firebase credentials** in `src/firebaseConfig.js`:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```

5. **Create build**
   ```bash
   npm run build
   ```

## Deployment

### GitHub Pages
```bash
npm run build
npm run deploy
```

Your app will be live at: `https://coachberry.github.io/coach-berry-stat-tracker/`

### Embed in Wix
```html
<iframe 
  src="https://coachberry.github.io/coach-berry-stat-tracker/" 
  width="100%" 
  height="800px" 
  style="border: none;"
></iframe>
```

## Firebase Setup

### Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.uid != null;
    }
    match /teamStats/{document=**} {
      allow read: if request.auth.uid != null;
      allow create, write: if request.auth.uid != null;
      allow delete: if request.auth.uid != null;
    }
  }
}
```

## Usage

### First Time
1. Sign up with your email and password (you become admin)
2. Go to Admin Dashboard
3. Create accounts for other coaches

### Adding Stats
1. Click "Add Game Stats"
2. Fill in game details (date, type, season)
3. Enter all relevant statistics
4. Stats are automatically calculated (Goal Diff, Shooting %, etc.)

### Viewing Statistics
1. Click "Statistics"
2. Filter by season and game type
3. Sort by any stat field
4. View detailed records

### Stat Leaders
1. Click "Stat Leaders"
2. Select season (by season or All-Time)
3. Choose which stat to rank by
4. Top 10 (season) or Top 20 (all-time) displayed

## File Structure
```
src/
├── components/
│   ├── Login.jsx & Login.css
│   ├── StatsEntry.jsx & StatsEntry.css
│   ├── StatisticsPage.jsx & StatisticsPage.css
│   ├── StatLeaders.jsx & StatLeaders.css
│   └── AdminDashboard.jsx & AdminDashboard.css
├── firebaseConfig.js
├── App.jsx
├── App.css
├── index.css
└── main.jsx
```

## Technologies

- **React 18** - UI Framework
- **Firebase Authentication** - Secure login
- **Firestore** - Real-time database
- **Vite** - Build tool
- **CSS 3** - Styling with gradients and responsive design

## Future Enhancements

- Individual player statistics
- Season-to-season comparisons
- CSV data export
- Advanced analytics and charts
- Photo gallery for games
- Multi-team support (SaaS)

## Troubleshooting

**Issue: Firebase connection error**
- Verify credentials in `firebaseConfig.js`
- Check Firestore is enabled in Firebase Console
- Verify security rules

**Issue: Stats not saving**
- Check browser console for errors
- Verify Firestore database rules allow write access
- Ensure user is authenticated

**Issue: GitHub Pages 404**
- Check repo settings → Pages points to `gh-pages` branch
- Verify `vite.config.js` base URL matches your repo name
- Clear browser cache and hard refresh

## License

MIT

## Support

For issues or questions, check the Firebase Console and browser console for detailed error messages.

---

**Built with ❤️ for hockey teams everywhere** 🏒
