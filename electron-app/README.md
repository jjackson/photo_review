# Photo Review Utility - Electron App

This is the Electron-based UI for the Photo Review Utility. It provides a modern desktop interface while using the existing Python backend functionality.

## Architecture

- **Frontend**: Electron with HTML/CSS/JavaScript
- **Backend**: Python FastAPI server (communicates with existing photo_utility code)
- **Communication**: HTTP REST API between Electron renderer and Python backend

## Prerequisites

- **Node.js** (version 16 or higher)
- **Python** 3.8 or higher
- **npm** (comes with Node.js)

## Installation

### 1. Install Node.js Dependencies

```bash
cd electron-app
npm install
```

### 2. Install Python Dependencies

From the `electron-app` directory:

```bash
npm run install-python-deps
```

Or manually:

```bash
pip install -r src/backend/requirements.txt
```

**Note**: The Python backend uses the existing `photo_utility` code from the parent directory, so make sure the main project's dependencies are also installed:

```bash
cd ..
pip install -r requirements.txt
```

## Running the Application

### From IDE (Recommended for Development)

1. **Open the project** in your IDE (VS Code, PyCharm, etc.)

2. **Navigate to the electron-app directory**:
   ```bash
   cd electron-app
   ```

3. **Start the application**:
   ```bash
   npm start
   ```

The application will:
- Automatically start the Python backend server on port 8765
- Launch the Electron window
- Connect the frontend to the backend

### From Command Line

```bash
cd electron-app
npm start
```

### Development Mode (with DevTools)

```bash
cd electron-app
npm run dev
```

This opens the Chrome DevTools automatically for debugging.

## How It Works

1. **Electron Main Process** (`main.js`):
   - Spawns the Python backend server as a subprocess
   - Creates the application window
   - Handles IPC communication for file dialogs

2. **Python Backend** (`src/backend/api_server.py`):
   - FastAPI server running on `http://127.0.0.1:8765`
   - Exposes REST API endpoints for all photo utility functionality
   - Uses the existing `photo_utility` modules from the parent directory

3. **Electron Renderer** (`src/renderer/`):
   - HTML/CSS/JS interface that replicates the original tkinter GUI
   - Communicates with Python backend via HTTP requests
   - Handles all UI interactions and displays

## Features

All original functionality is preserved:

- ✅ **Dual Data Sources**: Local directory or CommCareHQ API
- ✅ **Photo Filtering**: Multi-select filtering by question type
- ✅ **Custom Review Categories**: Define custom buckets
- ✅ **Known Bad Photo Integration**: Include fraudulent photos
- ✅ **Randomized Review Process**: Randomized photo presentation
- ✅ **CSV Export**: Export results with metadata

## File Structure

```
electron-app/
├── main.js                      # Electron main process
├── package.json                 # Node.js dependencies
├── README.md                    # This file
├── src/
│   ├── backend/
│   │   ├── api_server.py       # FastAPI backend server
│   │   └── requirements.txt     # Python dependencies
│   └── renderer/
│       ├── index.html           # Main UI
│       ├── styles.css           # UI styling
│       └── renderer.js          # UI logic and API communication
└── assets/
    └── icon.png                 # (Optional) App icon
```

## API Endpoints

The Python backend exposes the following REST endpoints:

- `POST /scan-directory` - Scan local directory for photos
- `POST /api-data` - Download photos from CommCareHQ API
- `POST /build-session` - Create a review session
- `GET /session-visit/{index}` - Get visit data with photos
- `POST /record-result` - Record review result
- `GET /export-results` - Get results for export
- `GET /settings` - Load saved settings
- `POST /settings` - Save settings

## Configuration

### API Credentials

Same as the original tool - create a `.env` file in the workspace root or in a Coverage directory:

```
COMMCARE_USERNAME=your_username
COMMCARE_API_KEY=your_api_key
```

### Domain/App Pairs File

Create a JSON file with domain and form mappings:

```json
{
  "domain1": "app_id_1",
  "domain2": "app_id_2"
}
```

## Troubleshooting

### Python Backend Won't Start

1. **Check Python installation**:
   ```bash
   python --version  # or python3 --version
   ```

2. **Install dependencies**:
   ```bash
   pip install -r src/backend/requirements.txt
   cd ..
   pip install -r requirements.txt
   ```

3. **Test backend manually**:
   ```bash
   cd electron-app
   python src/backend/api_server.py
   ```

### Electron Window Shows Error

- Check the console in DevTools (run with `npm run dev`)
- Verify the Python backend is running (check terminal output)
- Ensure the API URL is correct (default: `http://127.0.0.1:8765`)

### Photos Not Loading

- Ensure you have proper file permissions for the photo directories
- Check the backend terminal output for errors
- Verify the photo naming format matches CommCareHQ conventions

### Port Already in Use

If port 8765 is already in use:

1. Stop any running instances of the backend
2. Or change the port in `main.js` and `src/backend/api_server.py`

## Development Notes

### Modifying the UI

- Edit `src/renderer/index.html` for structure
- Edit `src/renderer/styles.css` for styling
- Edit `src/renderer/renderer.js` for functionality

### Modifying the Backend

- Edit `src/backend/api_server.py` to add/modify API endpoints
- The backend imports from the original `photo_utility` modules

### Adding New Features

1. Add backend endpoint in `api_server.py`
2. Add UI elements in `index.html` and `styles.css`
3. Add frontend logic in `renderer.js` to call the new endpoint

## Differences from Original

- **UI Framework**: Electron instead of customtkinter
- **Architecture**: Separate frontend and backend processes
- **Communication**: HTTP REST API instead of direct function calls
- **Platform**: More portable across operating systems

## Benefits of Electron Version

1. **Modern UI**: Clean, web-based interface
2. **Cross-platform**: Runs on Windows, macOS, and Linux
3. **Maintainable**: Separate concerns (UI vs logic)
4. **Extensible**: Easy to add new features
5. **Familiar**: Uses standard web technologies

## License

Same as the parent project.

## Support

For issues or questions, contact the Dimagi team or refer to the main project README.
