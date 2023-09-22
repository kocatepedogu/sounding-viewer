// SPDX-License-Identifier: GPL-3.0-or-later

/*
 * Copyright 2023 Doğu Kocatepe
 * This file is part of Sounding Viewer.

 * Sounding Viewer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * Sounding Viewer is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
 * for more details.

 * You should have received a copy of the GNU General Public License along
 * with Sounding Viewer. If not, see <https://www.gnu.org/licenses/>.
 */

import { app, session, BrowserWindow, ipcMain, nativeTheme, /*Menu*/ } from 'electron';
import { initializeAppData, getFileListFromFTP, downloadFromHTTPS, wgrib2 } from './io';
import path = require('path');

function createWindow () {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: Object.assign({
        "Content-Security-Policy": [ 
          `default-src 'self' 'unsafe-inline';` +
          `img-src https://tile.openstreetmap.org/;` +
          `connect-src https://rucsoundings.noaa.gov/;`
        ]
    }, details.responseHeaders)});
  });

  const win = new BrowserWindow({
    //icon: path.join(__dirname, '../../resources/icon64.ico'),
    autoHideMenuBar: true,
    width: 1024,
    height: 720,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'src/main/preload.js'),

      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
    }
  });

  ipcMain.handle('getFileListFromFTP', (event, host:string, directory: string) => {
    event;
    return getFileListFromFTP(host, directory);
  });

  ipcMain.handle('downloadFromHTTPS', (event, url:string, filename:string) => {
    event;
    return downloadFromHTTPS(url, filename);
  });

  ipcMain.handle('wgrib2', (event, gribfile:string) => {
    event;
    return wgrib2(gribfile);
  })

  nativeTheme.themeSource = 'dark';
  win.loadFile('./src/renderer/index.html')
}

try {
  initializeAppData();

  app.enableSandbox();
  app.whenReady().then(() => {
    //Menu.setApplicationMenu(null);
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  });
} catch (err) {
  console.error(err);
  app.quit();
}
