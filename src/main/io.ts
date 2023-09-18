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

import { exec } from 'child_process';
import fs = require('fs');
import path = require('path');
import Client = require('ftp');
import https = require('https');

let appDataDir: string;

/** 
 * Sets directory for storing local application data.
 */
export function initializeAppData() {
  switch (process.platform) {
    case 'win32':
      if (process.env['APPDATA'] === undefined) {
        throw new Error("%AppData% is undefined.");
      }

      appDataDir = process.env['APPDATA'];
      break;
    case 'darwin':
      if (process.env['HOME'] === undefined) {
        throw new Error("HOME is undefined.");
      }

      appDataDir = process.env['HOME'] + '/Library/Preferences';
      break;
    case 'linux':
    case 'freebsd':
    case 'netbsd':
    case 'openbsd':
    case 'sunos':
      if (process.env['HOME'] === undefined) {
        throw new Error('HOME is undefined');
      }

      appDataDir = process.env['HOME'] + "/.local/share";
      break;
  }

  appDataDir = path.join(appDataDir, 'sounding-viewer');
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir);
  }
}

/**
 * @param host Host name 
 * @param directory Directory path
 * @returns List of file and directory names found in the given FTP server.
 */
export function getFileListFromFTP(host: string, directory: string) {
  const errorMessage = 'Cannot get file list from FTP server ' + host + "/" + directory;
  return new Promise<string[]|Error>((resolve) => {
    try {
      const client = new Client();
      client.on('ready', () => {
        client.list(directory, function(err, list: {name: string}[]) {
          client.end();

          if (err) {
            resolve(new Error(errorMessage));
          } else {
            resolve(list.map(e => e.name));
          }
        })
      });

      client.on('error', () => {
        resolve(new Error(errorMessage));
      })

      client.connect({host: host});
    } catch (err) {
      resolve(new Error(errorMessage));
    }
  });
}

/**
 * Downloads the file at the given URL from an HTTPS server. The file gets downloaded
 * to the application data directory.
 * @param url URL of the file
 * @param filename Local file name
 * @returns undefined on success, Error on failure.
 */
export function downloadFromHTTPS(url: string, filename: string) {
  return new Promise<void|Error>((resolve) => {
    https.get(url, (res) => {
        const p = path.join(appDataDir, filename); 
        const filePath = fs.createWriteStream(p);
        res.pipe(filePath);
        filePath.on('finish', () => {
          filePath.close();
          resolve();
        });
    }).on('error', () => {
      resolve(new Error('Cannot download file ' + url));
    })
  });
}

/**
 * Runs wgrib2 with the given GRIB2 file, and returns its output.
 * @param gribfile GRIB2 file name (File must be under the application data directory)
 * @returns Parsed data as a multidimensional array
 */
export function wgrib2(gribfile: string) {
  const csvFilename = `${path.join(appDataDir, gribfile)}.csv`;
  const gribFilename = `${path.join(appDataDir, gribfile)}`;

  return new Promise<string[][]|Error>((resolve) => {
    exec(`wgrib2 -csv ${csvFilename} ` + gribFilename, (err) => {
      if (err) {
        Promise.resolve(new Error('wgrib2 returned an error'));
      }

      fs.readFile(`${csvFilename}`, 'utf8', (err, data:string) => {
        if (err) {
          resolve(new Error('An error occured while reading the CSV file produced by wgrib2'));
        }

        resolve(data.split('\n')
                    .map((e: string) => e.split(',')
                                         .slice(2)
                                         .map(str => str.replaceAll('"',''))));
      });
    })
  });
}
