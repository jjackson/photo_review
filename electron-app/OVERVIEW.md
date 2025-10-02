# Photo Review Utility - Electron Edition Overview

## What is This?

This is a **modernized Electron-based UI** for the Photo Review Utility that maintains 100% of the original functionality while providing a better user experience with a web-based interface.

## Why Electron?

- ✅ **Modern Interface**: Clean, responsive web-based UI
- ✅ **Cross-Platform**: Works identically on Windows, macOS, and Linux
- ✅ **Maintainable**: Separates UI (JavaScript) from business logic (Python)
- ✅ **No Code Duplication**: Uses the existing Python `photo_utility` code
- ✅ **Easy to Extend**: Standard web technologies (HTML/CSS/JavaScript)

## Architecture

```
┌─────────────────────────────────────────┐
│          Electron Frontend              │
│  (HTML/CSS/JavaScript in Chromium)      │
│                                         │
│  • Configuration UI                     │
│  • Photo Review Interface               │
│  • File Dialogs                         │
│  • CSV Export                           │
└──────────────┬──────────────────────────┘
               │
               │ HTTP REST API
               │ (Port 8765)
               │
┌──────────────▼──────────────────────────┐
│         Python Backend                   │
│      (FastAPI Server)                    │
│                                         │
│  • Uses existing photo_utility code     │
│  • Scans directories                    │
│  • Downloads from CommCareHQ API        │
│  • Manages review sessions              │
│  • Processes images                     │
└─────────────────────────────────────────┘
```

## Key Features

### All Original Functionality Preserved

1. **Dual Data Sources**
   - ✅ Local directory scanning
   - ✅ CommCareHQ API integration

2. **Photo Review Workflow**
   - ✅ Multi-select question filtering
   - ✅ Customizable review categories (buckets)
   - ✅ Percentage-based sampling
   - ✅ Known bad photo integration
   - ✅ Randomized presentation

3. **Data Export**
   - ✅ CSV export with metadata
   - ✅ Reviewer tracking
   - ✅ Timestamp recording

### Enhanced Features

- 🎨 **Better UI**: Modern, clean interface
- 🔄 **Better State Management**: Persistent settings
- 📱 **Responsive**: Adapts to different screen sizes
- 🐛 **Better Error Handling**: Clear error messages
- 🔍 **Better Debugging**: Chrome DevTools available

## File Structure Explained

```
electron-app/
│
├── 📄 main.js                   # Electron main process
│   ├─ Spawns Python backend
│   ├─ Creates app window
│   └─ Handles file dialogs
│
├── 📦 package.json              # Node.js configuration
│
├── 🚀 launch.sh / launch.bat    # Easy launch scripts
│
├── 📖 START_HERE.md             # Quick start guide
├── 📖 README.md                 # Full documentation
└── 📖 OVERVIEW.md               # This file
│
├── src/
│   ├── backend/
│   │   ├── 🐍 api_server.py          # FastAPI server
│   │   │   ├─ REST API endpoints
│   │   │   ├─ Imports photo_utility modules
│   │   │   └─ Manages session state
│   │   │
│   │   └── 📋 requirements.txt       # Python dependencies
│   │
│   └── renderer/
│       ├── 🌐 index.html             # Main UI structure
│       ├── 🎨 styles.css             # UI styling
│       └── ⚡ renderer.js            # UI logic & API calls
│
└── assets/
    └── icon.png                 # App icon (optional)
```

## How It Works

### Startup Sequence

1. **User runs** `npm start` or `launch.sh`
2. **Electron main.js**:
   - Spawns Python backend server on port 8765
   - Waits for server to be ready
   - Creates application window
   - Loads `renderer/index.html`
3. **Python backend** starts listening for HTTP requests
4. **Renderer** connects to backend and loads saved settings
5. **User** can now use the application

### Data Flow Example: Scanning Directory

```
User clicks "Browse" button
         ↓
Electron IPC: showOpenDialog
         ↓
User selects directory
         ↓
Renderer: Display path in input
         ↓
User clicks "Check Photo Data"
         ↓
Renderer: POST /scan-directory
         ↓
Python Backend: scan_directory_for_photos()
         ↓
Python: Returns photo metadata
         ↓
Renderer: Update UI with results
```

## API Endpoints

The Python backend exposes these REST endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/scan-directory` | Scan local directory for photos |
| POST | `/api-data` | Download photos from CommCareHQ |
| POST | `/build-session` | Create review session |
| GET | `/session-visit/{index}` | Get visit with photos (base64) |
| POST | `/record-result` | Record review result |
| GET | `/export-results` | Get results for CSV export |
| GET | `/settings` | Load saved settings |
| POST | `/settings` | Save settings |

## Communication Protocol

### Request Format (JavaScript → Python)
```javascript
fetch(`${API_URL}/scan-directory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directory: '/path/to/photos' })
})
```

### Response Format (Python → JavaScript)
```json
{
    "success": true,
    "valid_count": 150,
    "invalid_count": 5,
    "question_options": ["photo1", "photo2"],
    "question_counts": {"photo1": 100, "photo2": 50}
}
```

## Development Workflow

### Making UI Changes

1. Edit `src/renderer/index.html` (structure)
2. Edit `src/renderer/styles.css` (appearance)
3. Edit `src/renderer/renderer.js` (behavior)
4. Refresh the Electron window (Ctrl/Cmd+R)

### Making Backend Changes

1. Edit `src/backend/api_server.py`
2. Restart the application (backend auto-restarts)

### Adding a New Feature

Example: Add a "Delete Photo" feature

**Backend** (`api_server.py`):
```python
@app.delete("/photo/{photo_id}")
async def delete_photo(photo_id: str):
    # Delete logic here
    return {"success": True}
```

**Frontend** (`renderer.js`):
```javascript
async function deletePhoto(photoId) {
    const response = await fetch(`${API_URL}/photo/${photoId}`, {
        method: 'DELETE'
    });
    const data = await response.json();
    // Handle response
}
```

**UI** (`index.html`):
```html
<button onclick="deletePhoto('123')">Delete</button>
```

## Testing

### Test the Backend Independently
```bash
cd electron-app
python src/backend/api_server.py
```

Then visit `http://127.0.0.1:8765/` in your browser.

### Test the Frontend Independently
The renderer can connect to a running backend server separately.

### Integration Testing
Run the full app with `npm start` and test the complete workflow.

## Debugging

### Backend Debugging
- Check the terminal where you ran `npm start`
- Python errors and logs appear there
- Add `print()` statements to track execution

### Frontend Debugging
- Run with `npm run dev` to open DevTools
- Check Console tab for JavaScript errors
- Use Network tab to see API requests/responses
- Use Elements tab to inspect UI

### Common Issues

**Backend won't start**:
- Check Python dependencies: `pip install -r src/backend/requirements.txt`
- Check parent dependencies: `pip install -r ../requirements.txt`
- Verify Python version: `python --version` (need 3.8+)

**Frontend shows errors**:
- Check DevTools console
- Verify backend is running (check terminal)
- Test backend URL: `http://127.0.0.1:8765/`

**Photos won't load**:
- Check file permissions
- Verify photo naming format
- Check backend logs for errors

## Deployment

### For Internal Team Use (Current)

Users run from source:
```bash
cd electron-app
npm start
```

### For Distribution (Future)

Could package as standalone app:
```bash
npm install electron-builder
npm run build
```

This creates distributable installers for Windows/Mac/Linux.

## Advantages Over Original

| Feature | Original (tkinter) | Electron Version |
|---------|-------------------|------------------|
| UI Framework | customtkinter | Web (HTML/CSS/JS) |
| Cross-platform | Limited | Excellent |
| UI Customization | Moderate | Excellent |
| Developer Tools | Limited | Chrome DevTools |
| Async Operations | Threading | Native async/await |
| State Management | In-memory | Persistent + Session |
| Error Handling | Dialogs | Better UX |
| Network Requests | Direct | REST API |

## Future Enhancements

Possible improvements:

- 📊 **Analytics Dashboard**: Photo review statistics
- 🔍 **Advanced Filtering**: More complex query options
- 🎨 **Image Editing**: Crop, rotate, annotate photos
- 📱 **Mobile Support**: Responsive design for tablets
- 🔄 **Auto-sync**: Background photo downloads
- 💾 **Database**: SQLite for better data management
- 🔐 **Authentication**: User login system
- 📈 **Progress Tracking**: Review progress visualization

## Contributing

### Code Style

**Python**: Follow PEP 8
**JavaScript**: Use ES6+ features
**HTML/CSS**: Semantic HTML5, modern CSS

### Pull Requests

1. Test thoroughly
2. Update documentation
3. Follow existing code structure
4. Add comments for complex logic

## License

Same as parent project.

## Support

For questions or issues:
1. Check this documentation
2. Check `README.md` for detailed setup
3. Contact Dimagi team

---

**Built with ❤️ for the Dimagi team**
