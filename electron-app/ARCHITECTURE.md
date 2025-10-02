# Photo Review Utility - Electron App Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ELECTRON APPLICATION                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    MAIN PROCESS                             │    │
│  │                     (main.js)                               │    │
│  │                                                             │    │
│  │  • Spawns Python backend process                           │    │
│  │  • Creates application window                              │    │
│  │  • Handles native dialogs (file/folder selection)          │    │
│  │  • Manages app lifecycle                                   │    │
│  └──────────────┬──────────────────────────┬──────────────────┘    │
│                 │                          │                        │
│                 │ IPC                      │ Window                 │
│                 │                          │                        │
│  ┌──────────────▼──────────────────────────▼──────────────────┐    │
│  │               RENDERER PROCESS                              │    │
│  │         (index.html + styles.css + renderer.js)             │    │
│  │                                                             │    │
│  │  ┌───────────────────────────────────────────────────┐     │    │
│  │  │              USER INTERFACE                       │     │    │
│  │  │                                                   │     │    │
│  │  │  • Configuration Screen                          │     │    │
│  │  │    - Data source selection                       │     │    │
│  │  │    - Photo filter options                        │     │    │
│  │  │    - Review settings                             │     │    │
│  │  │                                                   │     │    │
│  │  │  • Review Screen                                 │     │    │
│  │  │    - Photo display (3 per row)                   │     │    │
│  │  │    - Category buttons                            │     │    │
│  │  │    - Progress indicator                          │     │    │
│  │  └───────────────────────────────────────────────────┘     │    │
│  │                                                             │    │
│  │  JavaScript Event Handlers:                                │    │
│  │  • browseLocalDirectory()                                  │    │
│  │  • checkLocalData()                                        │    │
│  │  • checkApiData()                                          │    │
│  │  • startReview()                                           │    │
│  │  • recordAndNext()                                         │    │
│  └─────────────┬───────────────────────────────────────────────┘    │
│                │                                                    │
└────────────────┼────────────────────────────────────────────────────┘
                 │
                 │ HTTP REST API
                 │ (http://127.0.0.1:8765)
                 │
┌────────────────▼────────────────────────────────────────────────────┐
│                      PYTHON BACKEND                                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   FastAPI Server                             │  │
│  │                  (api_server.py)                             │  │
│  │                                                              │  │
│  │  REST API Endpoints:                                        │  │
│  │  ┌────────────────────────────────────────────────────┐     │  │
│  │  │ POST /scan-directory                               │     │  │
│  │  │   → Scan local folder for photos                   │     │  │
│  │  ├────────────────────────────────────────────────────┤     │  │
│  │  │ POST /api-data                                     │     │  │
│  │  │   → Download from CommCareHQ API                   │     │  │
│  │  ├────────────────────────────────────────────────────┤     │  │
│  │  │ POST /build-session                                │     │  │
│  │  │   → Create review session with filters             │     │  │
│  │  ├────────────────────────────────────────────────────┤     │  │
│  │  │ GET /session-visit/{index}                         │     │  │
│  │  │   → Get visit data with base64 photos              │     │  │
│  │  ├────────────────────────────────────────────────────┤     │  │
│  │  │ POST /record-result                                │     │  │
│  │  │   → Save review decision                           │     │  │
│  │  ├────────────────────────────────────────────────────┤     │  │
│  │  │ GET /export-results                                │     │  │
│  │  │   → Get results for CSV export                     │     │  │
│  │  ├────────────────────────────────────────────────────┤     │  │
│  │  │ GET/POST /settings                                 │     │  │
│  │  │   → Load/save user preferences                     │     │  │
│  │  └────────────────────────────────────────────────────┘     │  │
│  │                                                              │  │
│  │  Session State Management:                                  │  │
│  │  • valid_metas: List[PhotoMeta]                             │  │
│  │  • session_visits: List[dict]                               │  │
│  │  • results: List[dict]                                      │  │
│  └────────────────┬─────────────────────────────────────────────┘  │
│                   │                                                │
│                   │ Direct Python imports                          │
│                   │                                                │
│  ┌────────────────▼─────────────────────────────────────────────┐  │
│  │          Original photo_utility Modules                      │  │
│  │              (../src/photo_utility/)                         │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────┐         │  │
│  │  │ scanner.py                                     │         │  │
│  │  │  • scan_directory_for_photos()                 │         │  │
│  │  │  • group_by_question_id()                      │         │  │
│  │  │  • group_by_form_id()                          │         │  │
│  │  └────────────────────────────────────────────────┘         │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────┐         │  │
│  │  │ filenames.py                                   │         │  │
│  │  │  • parse_commcare_filename()                   │         │  │
│  │  │  • PhotoMeta dataclass                         │         │  │
│  │  │  • is_image_file()                             │         │  │
│  │  └────────────────────────────────────────────────┘         │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────┐         │  │
│  │  │ gui.py                                         │         │  │
│  │  │  • find_env_file()                             │         │  │
│  │  │  • API helper functions                        │         │  │
│  │  └────────────────────────────────────────────────┘         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

                             ┌──────────────┐
                             │ External     │
                             │ Dependencies │
                             └──────┬───────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
          ┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
          │ CommCareHQ API │ │ .env file  │ │ Local photos   │
          │ (Photo data)   │ │(Credentials)│ │ (Directories)  │
          └────────────────┘ └────────────┘ └────────────────┘
```

## Component Details

### 1. Electron Main Process (`main.js`)

**Responsibilities:**
- Application lifecycle management
- Python backend process spawning
- Window creation and management
- Native OS dialogs (via IPC)

**Key Functions:**
```javascript
startPythonBackend()  // Spawns api_server.py
createWindow()        // Creates app window
stopPythonBackend()   // Cleanup on exit
```

**IPC Handlers:**
```javascript
ipcMain.handle('select-directory')  // Folder picker
ipcMain.handle('select-file')       // File picker
ipcMain.handle('save-file')         // Save dialog
ipcMain.handle('get-api-url')       // Returns backend URL
```

---

### 2. Electron Renderer Process (`src/renderer/`)

**Components:**

#### index.html
- Configuration screen layout
- Review screen layout
- Loading overlay
- Form inputs and buttons

#### styles.css
- Modern, clean styling
- Responsive grid layouts
- Button styles
- Loading animations

#### renderer.js
- Application state management
- Event handlers
- HTTP API communication
- UI updates

**Key Functions:**
```javascript
init()                    // Initialize app
handleDataSourceChange()  // Switch local/API mode
checkLocalData()          // Scan directory
checkApiData()           // Download from API
startReview()            // Build session
loadCurrentVisit()       // Load photos
recordAndNext()          // Save result & next
```

---

### 3. Python Backend (`src/backend/api_server.py`)

**Technology:** FastAPI + Uvicorn

**Session State:**
```python
session_state = {
    "valid_metas": [],      # List of PhotoMeta objects
    "invalid_paths": [],    # Invalid file paths
    "question_options": [], # Available questions
    "session_config": {},   # Review configuration
    "session_visits": [],   # Current session visits
    "results": []           # Review results
}
```

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/scan-directory` | POST | Scan local folder |
| `/api-data` | POST | Download from API |
| `/build-session` | POST | Create session |
| `/session-visit/{index}` | GET | Get visit data |
| `/record-result` | POST | Save result |
| `/export-results` | GET | Get all results |
| `/settings` | GET/POST | Settings I/O |

**Helper Functions:**
```python
parse_domain_form_file()   # Parse API config
load_api_credentials()     # Load from .env
get_forms_from_api()       # CommCareHQ API call
download_attachments()     # Download photos
process_downloaded_photos() # Process & parse
```

---

### 4. Original Photo Utility Modules

**No changes made** - backend imports and uses these directly:

#### scanner.py
```python
scan_directory_for_photos(root: Path)
  → (valid: List[PhotoMeta], invalid: List[Path])

group_by_question_id(metas)
  → Dict[question_id, List[PhotoMeta]]

group_by_form_id(metas)
  → Dict[form_id, List[PhotoMeta]]
```

#### filenames.py
```python
parse_commcare_filename(path: Path)
  → PhotoMeta | None

PhotoMeta dataclass:
  - json_block: str
  - question_id: str
  - user_id: str
  - form_id: str
  - extension: str
  - filename: str
  - filepath: Path
```

---

## Data Flow Examples

### Example 1: Scanning Local Directory

```
User Action: Click "Browse" → Select folder → Click "Check Photo Data"

1. renderer.js:browseLocalDirectory()
   → ipcRenderer.invoke('select-directory')
   → Electron shows folder picker
   → Returns: /path/to/photos

2. renderer.js:checkLocalData()
   → fetch(POST /scan-directory)
   → Body: { directory: "/path/to/photos" }

3. api_server.py:scan_directory()
   → scanner.scan_directory_for_photos(Path)
   → Returns: (valid_metas, invalid_paths)
   → Groups by question ID
   
4. Response: {
     success: true,
     valid_count: 150,
     question_options: ["photo1", "photo2"],
     question_counts: {photo1: 100, photo2: 50}
   }

5. renderer.js:
   → Updates UI with question checkboxes
   → Shows photo counts
   → Updates status message
```

### Example 2: Starting Review Session

```
User Action: Configure settings → Click "Start Review"

1. renderer.js:startReview()
   → Validates inputs
   → fetch(POST /build-session)
   → Body: {
       question_ids: ["photo1", "photo2"],
       buckets: ["Real", "Fake"],
       percent: 10.0,
       include_known_bad: true,
       known_bad_dir: "/path/to/bad",
       known_bad_count: 5
     }

2. api_server.py:build_session()
   → Filters photos by question IDs
   → Groups by form_id (visits)
   → Randomizes visits
   → Calculates target count (percent)
   → Adds known bad photos
   → Shuffles all visits
   → Stores in session_state

3. Response: {
     success: true,
     visit_count: 25,
     total_photos: 75
   }

4. renderer.js:
   → Switches to review screen
   → Creates bucket buttons
   → Calls loadCurrentVisit()
```

### Example 3: Displaying Photos

```
User Action: (Automatic after starting review)

1. renderer.js:loadCurrentVisit()
   → fetch(GET /session-visit/0)

2. api_server.py:get_session_visit(0)
   → Gets visit from session_state
   → For each photo:
     - Opens file
     - Reads binary data
     - Encodes as base64
     - Creates data URL
   
3. Response: {
     visit: {
       form_id: "abc-123",
       photos: [
         {
           filename: "photo1.jpg",
           image_data: "data:image/jpeg;base64,..."
         },
         ...
       ]
     },
     index: 0,
     total: 25
   }

4. renderer.js:renderPhotos()
   → Creates <img> elements
   → Sets src to base64 data URLs
   → Displays in 3-column grid
```

### Example 4: Recording Result

```
User Action: Click bucket button (e.g., "Real")

1. renderer.js:recordAndNext("Real")
   → fetch(POST /record-result)
   → Body: {
       visit_index: 0,
       bucket: "Real",
       reviewer_name: "John Doe"
     }

2. api_server.py:record_result()
   → Gets visit from session
   → Creates result record
   → Adds to session_state.results
   → Checks if complete

3. Response: {
     success: true,
     is_complete: false,
     results_count: 1
   }

4. renderer.js:
   → If not complete:
     - Increments visit index
     - Loads next visit
   → If complete:
     - Shows completion message
     - Prompts for CSV export
```

---

## Technology Stack

### Frontend
- **Electron**: Desktop app framework
- **HTML5**: Structure
- **CSS3**: Styling (Grid, Flexbox)
- **JavaScript ES6+**: Logic
- **Native APIs**: File dialogs

### Backend
- **Python 3.8+**: Language
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation

### Communication
- **HTTP REST**: Frontend ↔ Backend
- **IPC**: Renderer ↔ Main process
- **JSON**: Data format
- **Base64**: Image encoding

---

## Security Considerations

### Current (Internal Use)
- ✅ Localhost only (127.0.0.1)
- ✅ No external network exposure
- ✅ Uses existing .env credentials
- ✅ Same security as original tool

### Future Enhancements
- Could add CORS restrictions
- Could add API key authentication
- Could add request rate limiting
- Could encrypt sensitive data

---

## Performance Characteristics

### Bottlenecks
1. **Image encoding**: Base64 encoding of large images
2. **API downloads**: Network speed dependent
3. **File I/O**: Reading many images

### Optimizations
1. **Lazy loading**: Photos loaded per-visit
2. **Caching**: Session state in memory
3. **Streaming**: Images sent one visit at a time
4. **Async**: Non-blocking I/O

---

## Error Handling

### Frontend
```javascript
try {
  const response = await fetch(API_URL + '/endpoint');
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail);
} catch (error) {
  showError(error.message);
}
```

### Backend
```python
try:
  # Operation
  return {"success": True}
except Exception as e:
  raise HTTPException(status_code=500, detail=str(e))
```

---

This architecture provides:
- ✅ **Separation of Concerns**: UI vs Logic
- ✅ **Modularity**: Easy to modify components
- ✅ **Testability**: Can test parts independently
- ✅ **Maintainability**: Clear structure
- ✅ **Scalability**: Can add features easily
