// SPDX-License-Identifier: GPL-3.0-or-later

import * as rucsoundings from "./rucsoundings"
import * as nomads from "./nomads"
import * as data from "./data"
import * as table from "./table"
import * as diagram from "./diagram"
import * as indices from "./indices"

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

window.initializeSounding = function() {
  setTitle();
  getData().then(async (src: Iterable<data.LevelSource>) => {
    const sounding = new data.Sounding(src);
    const plt = new diagram.SoundingPlot(sounding);
    const ind = new indices.IndexTable(sounding);
    new table.SoundingTable(sounding);
  
    plt.update();
    ind.update();

    document.getElementById('main-div')!.style.visibility = "visible";
    document.getElementById('loading-div')!.style.visibility = "hidden";
  });
}
