# Quick Start Guide - Photo Review Utility Electron App

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Node.js Dependencies
```bash
cd electron-app
npm install
```

### Step 2: Install Python Dependencies
```bash
npm run install-python-deps
```

Or if that doesn't work:
```bash
pip install -r src/backend/requirements.txt
```

### Step 3: Run the App
```bash
npm start
```

That's it! The app will:
1. Start the Python backend server automatically
2. Open the Electron window
3. Be ready to use

## 📋 Prerequisites

Make sure you have:
- ✅ Node.js (v16+) - [Download here](https://nodejs.org/)
- ✅ Python (3.8+)
- ✅ pip (Python package installer)

## 🔧 Verify Installation

### Check Node.js:
```bash
node --version   # Should show v16.x.x or higher
npm --version    # Should show 8.x.x or higher
```

### Check Python:
```bash
python --version   # or python3 --version
pip --version      # or pip3 --version
```

## ⚠️ Troubleshooting

### Issue: "Python backend won't start"
**Solution**: Make sure Python dependencies are installed:
```bash
cd electron-app
pip install fastapi uvicorn pydantic pillow requests python-dateutil

# Also install parent project dependencies
cd ..
pip install -r requirements.txt
```

### Issue: "npm install fails"
**Solution**: Try clearing npm cache:
```bash
npm cache clean --force
npm install
```

### Issue: "Port 8765 already in use"
**Solution**: Kill any existing Python processes or change the port in `main.js`

## 📖 Full Documentation

See [README.md](README.md) for complete documentation.

## 🎯 First Time Using?

1. **Select a data source**:
   - Local directory: Browse to your downloaded CommCareHQ photos
   - CommCareHQ API: Configure API settings

2. **Click "Check Photo Data"** to load photos

3. **Configure review settings**:
   - Enter your name
   - Select which photo types to review
   - Set percentage of photos to review
   - Define review categories (buckets)

4. **Click "Start Review"** to begin

5. **Review photos** and click the appropriate category button

6. **Export results** when complete

## 🆘 Need Help?

- Check the terminal output for error messages
- Run in dev mode for debugging: `npm run dev`
- See the full [README.md](README.md) for detailed documentation

---

**Made for Dimagi team members** 🙌
