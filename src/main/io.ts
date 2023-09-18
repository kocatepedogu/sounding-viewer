/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const Client = require('ftp');
const https = require('https');

let appDataDir: string;
function initializeAppData() {
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

async function listFiles(host: string, directory: string) {
  const errorMessage = 'Cannot get file list from FTP server ' + host + "/" + directory;
  return new Promise<string[]|Error>((resolve) => {
    try {
      const client = new Client();
      client.on('ready', () => {
        client.list(directory, function(err: never, list: {name: string}[]) {
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

async function download(url: string, filename: string) {
  return new Promise<void|Error>((resolve) => {
    https.get(url, (res: any) => {
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

async function wgrib2(gribfile: string) {
  const csvFilename = `${path.join(appDataDir, gribfile)}.csv`;
  const gribFilename = `${path.join(appDataDir, gribfile)}`;

  return new Promise<string[][]|Error>((resolve) => {
    exec(`wgrib2 -csv ${csvFilename} ` + gribFilename, (err: never) => {
      if (err) {
        resolve(new Error('wgrib2 returned an error'));
      }

      fs.readFile(`${csvFilename}`, 'utf8', (err:never, data:string) => {
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

module.exports = {
  initializeAppData,
  listFiles, 
  download, 
  wgrib2
};