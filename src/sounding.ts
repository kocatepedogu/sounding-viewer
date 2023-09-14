// SPDX-License-Identifier: GPL-3.0-or-later

import * as rucsoundings from "./sounding-rucsoundings.js"
import * as data from "./sounding-data.js"
import * as table from "./sounding-table.js"
import * as diagram from "./sounding-diagram.js"
import * as indices from "./sounding-indices.js"

function getData() {
  const url = new URL(window.location.href);
  const src = url.searchParams.get('src');

  switch (src) {
    case 'rucsoundings':
      return rucsoundings.fetchGSD(url.searchParams);
    case "nomads": {
      throw new Error("Not implemented");
    }
  }

  throw new Error("Not implemented");
}

async function initialize() {
  const raw = await getData();
  const sounding = new data.Sounding(raw);
  const plt = new diagram.SoundingPlot(sounding);
  const ind = new indices.IndexTable(sounding);
  const tbl = new table.SoundingTable(sounding);

  plt.update();
  ind.update();
}

initialize();
