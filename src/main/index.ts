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

/* eslint-disable @typescript-eslint/no-var-requires */

const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const { initializeAppData, listFiles, download, wgrib2 } = require('./io');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    autoHideMenuBar: true,
    width: 1152,
    height: 720,
    minWidth: 1152,
    minHeight: 720,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'src/main/preload.js')
    }
  })

  ipcMain.handle('listFiles', (event:never, host:string, directory: string) => {
    <never>event;
    return listFiles(host, directory);
  });

  ipcMain.handle('download', (event:never, url:string, filename:string) => {
    <never>event;
    return download(url, filename);
  });

  ipcMain.handle('wgrib2', (event:never, gribfile:string) => {
    <never>event;
    return wgrib2(gribfile);
  })

  nativeTheme.themeSource = 'dark';
  win.loadFile('./src/renderer/index.html')
}

try {
  initializeAppData();

  app.whenReady().then(() => {
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