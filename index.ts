// SPDX-License-Identifier: GPL-3.0-or-later
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 1024,
    webPreferences: {
      //preload: 'app.js'
    }
  })

  win.loadFile('./src/index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

