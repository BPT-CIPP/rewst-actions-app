const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

// Path to store the JSON actions file
const actionsFilePath = path.join(app.getPath('userData'), 'rewst-actions.json');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),  // Reference preload.js
            nodeIntegration: false,  // Ensure security
            contextIsolation: true   // Ensure security
        }
    });

    win.loadFile('index.html');
}

// Handle copying the JSON string to the clipboard
ipcMain.on('copy-action', (event, action) => {
    clipboard.writeText(action);
    event.reply('action-copied', 'Action copied to clipboard!');
});

// Handle saving actions to file
ipcMain.on('save-actions', (event, actions) => {
    fs.writeFile(actionsFilePath, JSON.stringify(actions, null, 2), (err) => {
        if (err) {
            console.error('Failed to save actions:', err);
            event.reply('save-actions-result', { success: false, error: err });
        } else {
            event.reply('save-actions-result', { success: true });
        }
    });
});

// Handle loading actions from file
ipcMain.handle('load-actions', (event) => {
    try {
        // Check if the file exists
        if (fs.existsSync(actionsFilePath)) {
            const data = fs.readFileSync(actionsFilePath, 'utf-8');
            // Return parsed JSON if the file is not empty
            return data.length > 0 ? JSON.parse(data) : [];
        } else {
            // If file doesn't exist, return an empty array
            return [];
        }
    } catch (err) {
        console.error('Failed to load actions:', err);
        return [];  // Return an empty array in case of error
    }
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
