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

import * as data from "./sounding"

type SoundingIndex = {
  id: string;
  name: string;
}

export class IndexTable {
  private worker!: Worker;
  private sounding: data.Sounding;
  private indices: SoundingIndex[] = [
    { id: "sfc-cape", name: "SFC CAPE" },
    { id: "sfc-cin", name: "SFC CIN" },
    { id: "sfc-updraft", name: "SFC Maximum updraft (m/s)" },
    { id: "sfc-lfc", name: "SFC LFC (m)" },
    { id: "sfc-el", name: "SFC EL (m)" },
    { id: "sfc-lftx", name: "SFC Lifted Index" },
    { id: "mu-parcel", name: 'Most unstable parcel (mb)'},
    { id: "mu-cape", name: 'MU CAPE'},
    { id: "mu-cin", name: 'MU CIN'},
    { id: "mu-lftx", name: 'MU Lifted Index'},
    { id: "pw", name: 'Precipitable Water'},
    { id: "k", name: 'K Index'},
    { id: "tt", name: 'Totals Totals'},
    { id: "soaring", name: 'Soaring Index'},
    { id: "boyden", name: 'Boyden Index'},
    { id: "vt", name: 'Vertical Totals'},
    { id: "ct", name: 'Cross Totals'},
    { id: "mji", name: 'Modified Jefferson Index'},
    { id: "rackliff", name: 'Rackliff Index'},
    { id: "thompson", name: 'Thompson Index'},
    { id: "showalter", name: 'Showalter Index'},
    { id: "modified-k", name: 'Modified K Index'},
    { id: "modified-tt", name: 'Modified Totals Totals'},
    { id: "cii", name: 'Convective Instability Index'},
    { id: "fsi", name: 'Fog Stability Index'},
    { id: "dci", name: 'Deep Convective Index'},
    { id: "ko", name: 'Ko Index'},
    { id: "pii", name: 'Potential Instability Index'},
    { id: "hi", name: 'Humidity Index'},
    { id: "inflow-bottom", name: "Inflow Bottom (m)"},
    { id: "inflow-top", name: "Inflow Top (m)"},
    { id: "shear-1", name: 'Bulk Shear 0-1 km (kt)'},
    { id: "shear-3", name: 'Bulk Shear 0-3 km (kt)'},
    { id: "shear-6", name: 'Bulk Shear 0-6 km (kt)'},
    { id: "shear-8", name: 'Bulk Shear 0-8 km (kt)'},
    { id: "shear-inflow", name: 'Bulk Shear Inflow (kt)'},
    { id: "bunkers-r", name: 'Bunkers STM (R) (kt)'},
    { id: "bunkers-l", name: 'Bunkers STM (L) (kt)'},
    { id: "sreh-1", name: 'SReH (0-1 km) (m^2/s^2)'},
    { id: "sreh-3", name: 'SReH (0-3 km) (m^2/s^2)'},
    { id: "sreh-inflow", name: 'SReH (Inflow) (m^2/s^2)'},
    { id: "ehi-1", name: 'Energy Helicity Index 0-1km'},
    { id: "ehi-3", name: 'Energy Helicity Index 0-3km'},
    { id: "ehi-inflow", name: 'Energy Helicity Index Inflow'},
    { id: "sweat", name: 'SWEAT Index'},
    { id: "scp", name: 'SCP'},
  ];

  constructor(sounding: data.Sounding) {
    this.sounding = sounding;
    this.sounding.addObserver(() => {
      this.update();
    });

    const indicesDiv = document.getElementById('sounding-indices-body')!;
    indicesDiv.replaceChildren();

    for (const index of this.indices) {
      const name = document.createElement("div");
      name.innerText = index.name;
      name.className = "sounding-indices-name-column";

      const value = document.createElement("div");
      value.id = 'index-' + index.id;
      value.textContent = '...';

      value.className = "sounding-indices-value-column";

      const row = document.createElement("div");
      row.className = "sounding-indices-row";
      row.appendChild(name);
      row.appendChild(value);
      indicesDiv.appendChild(row);
    }
  }

  /* Computes and prints indices */
  printIndices() {
    let workerInitialized = false;
    let index = 0;

    this.worker && this.worker.terminate();
    this.worker = new Worker('./indices-worker.js', { type: "module" });

    const send = () => {
      document.getElementById('index-' + this.indices[index].id)!.textContent += '...';
      this.worker.postMessage(index);
      index++;
    }

    const receive = (value: number) => {
      const element = document.getElementById('index-' + this.indices[index - 1].id)!;
      element.textContent = value.toFixed(2);
    }

    this.worker.onmessage = (e) => {
      if (e.data == 'initialized') {
        workerInitialized = true;
        send();
      } 
      else if (workerInitialized) {
        receive(e.data);
        if (index < this.indices.length) {
          send();
        }
      }
    }

    this.worker.postMessage(JSON.stringify(this.sounding));
  }

  update() {
    this.printIndices();
  }
}
