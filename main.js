const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// Create a browser window for your app
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: true
        }
    });

    win.loadFile('index.html');
}

// Path to the actions.json file
const jsonFilePath = path.join(__dirname, 'actions.json');

// Read actions.json or create it if missing
ipcMain.handle('load-actions', async () => {
    if (!fs.existsSync(jsonFilePath)) {
        fs.writeFileSync(jsonFilePath, '[]', 'utf8');  // Create file if missing
        console.log('actions.json not found, creating new file.');
    } else {
        console.log('actions.json exists, loading data...');
    }
    
    const data = fs.readFileSync(jsonFilePath, 'utf8');
    console.log('Loaded actions:', data);  // Log loaded actions to terminal
    return data;
});

// Save button actions to actions.json
ipcMain.handle('save-actions', async (event, data) => {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(jsonFilePath, jsonData, 'utf8');
    console.log('Saved actions:', jsonData);  // Log saved actions to terminal
    return { status: 'success' };
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
