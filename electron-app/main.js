const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess;
const API_PORT = 8765;
const API_URL = `http://127.0.0.1:${API_PORT}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startPythonBackend() {
  return new Promise((resolve, reject) => {
    console.log('Starting Python backend server...');
    
    // Find the python executable
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    // Path to the backend server
    const backendScript = path.join(__dirname, 'src', 'backend', 'api_server.py');
    
    // Check if the script exists
    if (!fs.existsSync(backendScript)) {
      console.error('Backend script not found:', backendScript);
      reject(new Error('Backend script not found'));
      return;
    }
    
    // Start the Python process
    pythonProcess = spawn(pythonCmd, [backendScript], {
      cwd: path.join(__dirname, '..'), // Run from workspace root
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });
    
    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python stdout: ${data}`);
      
      // Check if server has started
      if (data.toString().includes('Uvicorn running') || data.toString().includes('Application startup complete')) {
        console.log('Python backend server started successfully');
        resolve();
      }
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
    });
    
    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      reject(err);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      resolve(); // Continue anyway, let the renderer handle connection errors
    }, 10000);
  });
}

function stopPythonBackend() {
  if (pythonProcess) {
    console.log('Stopping Python backend server...');
    pythonProcess.kill();
    pythonProcess = null;
  }
}

// IPC Handlers for file dialogs
ipcMain.handle('select-directory', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-file', async (event, options) => {
  const dialogOptions = {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'All Files', extensions: ['*'] }
    ]
  };
  
  const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('save-file', async (event, options) => {
  const dialogOptions = {
    defaultPath: options?.defaultPath || 'results.csv',
    filters: options?.filters || [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  };
  
  const result = await dialog.showSaveDialog(mainWindow, dialogOptions);
  
  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

ipcMain.handle('get-api-url', () => {
  return API_URL;
});

// App lifecycle
app.on('ready', async () => {
  try {
    await startPythonBackend();
    createWindow();
  } catch (err) {
    console.error('Error starting app:', err);
    // Create window anyway, let user see error messages
    createWindow();
  }
});

app.on('window-all-closed', function () {
  stopPythonBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  stopPythonBackend();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
