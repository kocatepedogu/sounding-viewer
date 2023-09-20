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

import { GSD } from './gsd'
import * as rucsoundings from "./rucsoundings"
import * as nomads from "./nomads"
import * as sounding from "./sounding"
import * as table from "./table"
import * as diagram from "./diagram"
import * as indices from "./indices"
import * as levelDetails from "./leveldetails"
import { Dialog } from "./dialog"

function getData(){
  const url = new URL(window.location.href);
  const src = url.searchParams.get('src');

  switch (src) {
    case 'rucsoundings':
      return rucsoundings.fetchData(url.searchParams);
    case "nomads":
      return nomads.fetchGRIB(url.searchParams);
    case 'import':
      return GSD.parse(localStorage.getItem('import')!);
  }

  throw new Error("Not implemented");
}

function exportData(data: sounding.Sounding) {
  const gsd = GSD.from(data);
  const str = GSD.stringify(gsd);

  const a = document.createElement('a');
  a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(str));
  a.setAttribute('download', 'sounding.txt');
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function setTitle() {
  const url = new URL(window.location.href);
  const src = url.searchParams.get('src');
  if (src == 'import') {
    document.getElementById('sounding-diagram-title')!.innerText = 'Imported';
    return;
  }

  const type = url.searchParams.get('type');
  const lat = parseFloat(url.searchParams.get('lat')!).toFixed(4);
  const lon = parseFloat(url.searchParams.get('lon')!).toFixed(4);
  const hour = url.searchParams.get('hour');
  const modelName = (()=>{
    switch (src) {
      case "rucsoundings":
        if (type == 'gfs') return 'GFS 0.5';
        break;
      case 'nomads':
        if (type == 'gfs') return 'GFS 0.25';
        break;
    }
    throw new Error('Not implemented');
  })();
  
  document.getElementById('sounding-diagram-title')!.innerText = 
    `${modelName} ${lat},${lon} ${hour}h`;
}

window.initializeSounding = async function() {
  const src = await (async () => {
    try {
      return await getData();
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      }

      location.assign('./index.html');
      throw err;
    }
  })();

  setTitle();
  const snd = new sounding.Sounding(src);
  const plt = new diagram.SoundingPlot(snd);
  const ind = new indices.IndexTable(snd);
  const tbl = new table.SoundingTable(snd);
  const det = new levelDetails.LevelDetails(snd);

  plt.addObserver((lev) => det.setLevel(lev));
  tbl.addObserver((lev) => det.setLevel(lev));
  plt.update();
  ind.update();

  document.getElementById('export-btn')?.addEventListener('click', () => {
    exportData(snd);
  });

  document.getElementById('level-details-btn')?.addEventListener('click', () => {
    const levelDetailsDialog = document.getElementById('sounding-level-details');
    levelDetailsDialog!.hidden = false;
  })

  document.getElementById('main-div')!.style.visibility = "visible";
  document.getElementById('loading-div')!.style.visibility = "hidden";

  new Dialog("sounding-diagram-settings");
  new Dialog("sounding-level-details");
}
