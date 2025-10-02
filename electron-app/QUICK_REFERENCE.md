# Photo Review Utility - Electron App Quick Reference

## 🚀 Installation & Launch

### First Time Setup
```bash
cd electron-app
npm install
npm run install-python-deps
```

### Launch the App
```bash
npm start
```

Or use the launch scripts:
- **Mac/Linux**: `./launch.sh`
- **Windows**: `launch.bat`

---

## 📁 Key Files Reference

| File | Purpose | Edit For |
|------|---------|----------|
| `main.js` | Electron main process | Window mgmt, backend spawning |
| `src/renderer/index.html` | UI structure | Adding UI elements |
| `src/renderer/styles.css` | UI styling | Changing appearance |
| `src/renderer/renderer.js` | UI logic | Adding features |
| `src/backend/api_server.py` | REST API | Adding endpoints |

---

## 🔧 Common Tasks

### Change UI Text
Edit: `src/renderer/index.html`
```html
<h1>Photo Review Utility</h1>
```

### Change UI Colors
Edit: `src/renderer/styles.css`
```css
.btn-primary {
    background-color: #1e88e5;
}
```

### Add a New API Endpoint
Edit: `src/backend/api_server.py`
```python
@app.get("/new-endpoint")
async def new_endpoint():
    return {"data": "value"}
```

### Call API from Frontend
Edit: `src/renderer/renderer.js`
```javascript
const response = await fetch(`${API_URL}/new-endpoint`);
const data = await response.json();
```

---

## 🐛 Debugging

### Open Developer Tools
```bash
npm run dev
```
Or press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)

### View Backend Logs
Check the terminal where you ran `npm start`

### Test Backend Independently
```bash
cd electron-app
python src/backend/api_server.py
```
Visit http://127.0.0.1:8765/

---

## 📡 API Endpoints Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/scan-directory` | POST | Scan local photos |
| `/api-data` | POST | Download from API |
| `/build-session` | POST | Create review session |
| `/session-visit/{index}` | GET | Get visit data |
| `/record-result` | POST | Save review result |
| `/export-results` | GET | Get results |
| `/settings` | GET | Load settings |
| `/settings` | POST | Save settings |

---

## 🎨 UI Components Reference

### Configuration Screen
```javascript
// Data source selection
elements.sourceLocal        // Radio: Local directory
elements.sourceApi          // Radio: CommCareHQ API

// Local mode
elements.localDirectory     // Input: directory path
elements.browseLocal        // Button: browse folders
elements.checkLocalData     // Button: scan directory

// API mode  
elements.dateStart          // Input: start date
elements.dateEnd            // Input: end date
elements.apiLimit           // Input: form limit
elements.apiFile            // Input: domain/app file
elements.checkApiData       // Button: download photos

// Filters & settings
elements.photoFilterList    // Container: question checkboxes
elements.buckets            // Input: review categories
elements.percent            // Input: sample percentage
elements.includeKnownBad    // Checkbox: known bad photos
elements.startReview        // Button: start review
```

### Review Screen
```javascript
elements.progressText       // Text: "Photo Review X/Y"
elements.photoContainer     // Container: photo grid
elements.bucketButtons      // Container: category buttons
elements.backToConfig       // Button: return to config
```

---

## 💾 Application State

### Frontend State (`renderer.js`)
```javascript
state = {
    reviewerName: string,
    dataSource: 'local' | 'api',
    localDirectory: string,
    apiFile: string,
    questionOptions: string[],
    selectedQuestions: string[],
    buckets: string[],
    percent: number,
    currentVisitIndex: number,
    totalVisits: number
}
```

### Backend State (`api_server.py`)
```python
session_state = {
    "valid_metas": List[PhotoMeta],
    "invalid_paths": List[str],
    "question_options": List[str],
    "session_config": dict,
    "session_visits": List[dict],
    "results": List[dict]
}
```

---

## 🔄 Workflow Overview

### 1. Configuration Phase
```
Select Data Source → Load Photos → Configure Filters → Start Review
```

### 2. Review Phase
```
Display Photos → Select Category → Record Result → Next/Complete
```

### 3. Export Phase
```
Review Complete → Save CSV → Return to Config
```

---

## ⚠️ Common Issues

### Issue: Backend won't start
```bash
# Install dependencies
pip install -r src/backend/requirements.txt
pip install -r ../requirements.txt
```

### Issue: Port 8765 in use
```bash
# Find and kill process
# Mac/Linux:
lsof -ti:8765 | xargs kill -9
# Windows:
netstat -ano | findstr :8765
taskkill /PID <PID> /F
```

### Issue: Photos won't load
- Check file permissions
- Verify photo naming format
- Check backend terminal for errors

### Issue: API download fails
- Check .env file exists
- Verify credentials are correct
- Check network connection
- Verify domain/app pairs file format

---

## 📊 File Size Limits

| Item | Limit | Note |
|------|-------|------|
| API Forms | 1000 per domain | Configurable in UI |
| Photos per visit | Unlimited | Display 3 per row |
| Review sessions | Unlimited | Based on percentage |
| Base64 images | ~10MB | Browser memory limit |

---

## 🎯 Keyboard Shortcuts

When window is focused:
- `Ctrl/Cmd + R` - Reload window
- `Ctrl/Cmd + Shift + I` - Open DevTools (dev mode)
- `Ctrl/Cmd + Q` - Quit application

---

## 📦 Dependencies Version Quick Check

### Frontend
```bash
node --version    # Should be v16+
npm --version     # Should be v8+
```

### Backend
```bash
python --version  # Should be 3.8+
pip --version     # Any recent version
```

---

## 🌐 URLs & Ports

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://127.0.0.1:8765 | REST endpoints |
| Electron Renderer | file:// | UI (local file) |
| CommCareHQ API | https://www.commcarehq.org/a/{domain}/api/v0.5/ | Photo source |

---

## 📝 Settings File Location

Application settings stored in:
```
workspace_root/app_settings.txt
```

Contains:
- Reviewer name
- Last directory
- API file path

---

## 🔍 Where to Find...

### Error messages
- **Frontend errors**: DevTools Console
- **Backend errors**: Terminal output
- **Python errors**: Terminal with traceback

### Logs
- **Electron**: Terminal where npm start was run
- **Python**: Same terminal, prefixed with process output

### Downloaded photos
```
workspace_root/downloaded_photos/session_YYYYMMDD_HHMMSS/
```

### Exported CSV
User-selected location (via save dialog)

---

## 🎓 Learning Resources

### Electron
- [Official Docs](https://www.electronjs.org/docs)
- [API Reference](https://www.electronjs.org/docs/api)

### FastAPI
- [Official Docs](https://fastapi.tiangolo.com/)
- [Tutorial](https://fastapi.tiangolo.com/tutorial/)

### Project Docs
1. `START_HERE.md` - Quickstart
2. `README.md` - Full docs
3. `OVERVIEW.md` - Architecture overview
4. `ARCHITECTURE.md` - Detailed architecture
5. `VERIFICATION_CHECKLIST.md` - Testing guide

---

## 🚨 Emergency Commands

### Kill Everything
```bash
# Stop app with Ctrl+C in terminal

# Or force kill:
# Mac/Linux:
pkill -f "electron"
pkill -f "api_server"

# Windows:
taskkill /F /IM electron.exe
taskkill /F /IM python.exe
```

### Clean Reinstall
```bash
cd electron-app
rm -rf node_modules
npm install
pip install -r src/backend/requirements.txt
```

### Reset Settings
```bash
rm app_settings.txt
# Restart app - will use defaults
```

---

## 💡 Pro Tips

1. **Use dev mode** for debugging: `npm run dev`
2. **Test backend separately** before full app testing
3. **Check terminal output** for Python errors
4. **Use DevTools Network tab** to debug API calls
5. **Keep browser console open** during development
6. **Save often** - settings persist automatically
7. **Use launch scripts** for easiest startup

---

## 📞 Getting Help

1. Check this Quick Reference
2. Read `README.md` for detailed setup
3. Review `ARCHITECTURE.md` for system design
4. Check `VERIFICATION_CHECKLIST.md` for testing
5. Contact Dimagi team

---

**Happy Reviewing! 🎉**
