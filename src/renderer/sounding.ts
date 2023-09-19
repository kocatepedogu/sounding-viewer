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

import * as rucsoundings from "./rucsoundings"
import * as nomads from "./nomads"
import * as data from "./data"
import * as table from "./table"
import * as diagram from "./diagram"
import * as indices from "./indices"
import { Dialog } from "./dialog"

function getData(){
  const url = new URL(window.location.href);
  const src = url.searchParams.get('src');

  switch (src) {
    case 'rucsoundings':
      return rucsoundings.fetchGSD(url.searchParams);
    case "nomads": {
      return nomads.fetchGRIB(url.searchParams);
    }
  }

  throw new Error("Not implemented");
}

function setTitle() {
  const url = new URL(window.location.href);
  const src = url.searchParams.get('src');
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

getData;

window.initializeSounding = function() {
  //setTitle();
  setTitle;
  rucsoundings.example().then(async (src: Iterable<data.LevelSource>) => {
    const sounding = new data.Sounding(src);
    const plt = new diagram.SoundingPlot(sounding);
    const ind = new indices.IndexTable(sounding);
    new table.SoundingTable(sounding);
  
    plt.update();
    ind.update();

    document.getElementById('main-div')!.style.visibility = "visible";
    document.getElementById('loading-div')!.style.visibility = "hidden";
  });

  new Dialog("sounding-diagram-settings");
}
