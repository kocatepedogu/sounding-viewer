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
import * as numerical from "./numerical"

type SoundingIndex = {
  /** func takes the sounding as argument and returns an index value */
  func: (sounding: data.Sounding) => number;
  /** Name gets printed as the label of the index */
  name: string;
}

export class IndexTable {
  private sounding: data.Sounding;
  private indices: SoundingIndex[];

  constructor(sounding: data.Sounding) {
    this.sounding = sounding;
    this.sounding.addObserver(() => {
      this.update();
    });

    const fnTemp = (p: number) => this.sounding.getValueAt(p, 'temp');
    const fnDewp = (p: number) => this.sounding.getValueAt(p, 'dewpt');
    const fnSpd = (p: number) => this.sounding.getValueAt(p, 'windspd');
    const fnDir = (p: number) => this.sounding.getValueAt(p, 'winddir');
    const fnHeight = (p: number) => this.sounding.getValueAt(p, 'height');
    const fnWind = (h: number) => this.sounding.getWindAt(h);
    const pBegin = () => this.sounding.first().pressure;
    const pEnd = () => this.sounding.last().pressure;
    const zBegin = () => this.sounding.first().height;
    const zEnd = () => this.sounding.last().height;

    fnTemp;fnDewp;fnSpd;fnDir;fnHeight;pBegin;pEnd;zBegin;zEnd;

    let CAPE: number = NaN;
    let CIN: number = NaN;
    let LFC: number = NaN;
    let EL: number = NaN;

    let inflow: [number, number] = [NaN, NaN];

    this.indices = [
      {func: () => {
        [CAPE, CIN, LFC, EL] = numerical.computeCAPE(fnTemp, fnDewp, pBegin(), pEnd());
        return CAPE;
      }, name: "CAPE"},

      {func: () => CIN,
        name: "CIN"},

      {func: () => Math.sqrt(2 * CAPE),
        name: "Maximum updraft (m/s)"},

      {func: () => sounding.getValueAt(LFC, 'height'),
        name: "Level of Free Convection"},

      {func: () => sounding.getValueAt(EL, 'height'),
        name: "Equilibrium Level"},
  
      {func: () => numerical.computeLiftedIndex(fnTemp, fnDewp, pBegin()),
        name: "Lifted Index"},

      {func: () => numerical.computePW(fnDewp, pBegin(), pEnd()),
        name: "Precipitable Water"},
  
      {func: () => numerical.computeK(fnTemp, fnDewp), 
        name: "K Index"},
  
      {func: () => numerical.computeTT(fnTemp, fnDewp), 
        name: "Totals Totals"},
  
      {func: () => numerical.computeBoyden(fnTemp, fnHeight), 
        name: "Boyden Index"},
  
      {func: () => numerical.computeVT(fnTemp), 
        name: "Vertical Totals"},
  
      {func: () => numerical.computeCT(fnTemp, fnDewp), 
        name: "Cross Totals"},
  
      {func: () => numerical.computeMJI(fnTemp, fnDewp), 
        name: "Modified Jefferson Index"},
  
      {func: () => numerical.computeRackliff(fnTemp, fnDewp), 
        name: "Rackliff Index"},
  
      {func: () => numerical.computeThompson(fnTemp, fnDewp, pBegin()), 
        name: "Thompson Index"},
  
      {func: () => numerical.computeShowalter(fnTemp, fnDewp), 
        name: "Showalter Index"},
  
      {func: () => numerical.computeModifiedK(fnTemp, fnDewp, pBegin()), 
        name: "Modified K Index"},
  
      {func: () => numerical.computeModifiedTT(fnTemp, fnDewp, pBegin()), 
        name: "Modified Totals Totals"},
  
      {func: () => numerical.computeCII(fnTemp, fnDewp, pBegin()), 
        name: "Convective Instability Index"},
  
      {func: () => numerical.computeFSI(fnTemp, fnDewp, fnSpd, pBegin()), 
        name: "Fog Stability Index"},
  
      {func: () => numerical.computeDCI(fnTemp, fnDewp, pBegin()), 
        name: "Deep Convective Index"},
  
      {func: () => numerical.computeKo(fnTemp, fnDewp), 
        name: "Ko Index"},
  
      {func: () => numerical.computePII(fnTemp, fnDewp, fnHeight), 
        name: "Potential Instability Index"},
  
      {func: () => numerical.computeHumidityIndex(fnTemp, fnDewp), 
        name: "Humidity Index"},
  
      {func: () => numerical.computeShear(fnWind, zBegin(), zBegin() + 1000) / 1.852,
        name: "Bulk Shear 0-1 km (kt)"},

      {func: () => numerical.computeShear(fnWind, zBegin(), zBegin() + 3000) / 1.852,
        name: "Bulk Shear 0-3 km (kt)"},

      {func: () => numerical.computeShear(fnWind, zBegin(), zBegin() + 6000) / 1.852,
        name: "Bulk Shear 0-6 km (kt)"},

      {func: () => numerical.computeShear(fnWind, zBegin(), zBegin() + 8000) / 1.852,
        name: "Bulk Shear 0-8 km (kt)"},

      {func: () => {
        let inflowLayer: [number, number]|undefined = undefined;
        /* Find the longest effective inflow layer */
        let lastThickness = 0;
        numerical.computeEffectiveInflow(fnTemp, fnDewp, pBegin(), pEnd()).forEach(
          (layer) => {
            const [bottom, top] = layer;
            const thickness = numerical.hypsometricEquation(bottom, top, fnTemp, fnDewp);
            if (thickness > lastThickness) {
              inflowLayer = layer;
              lastThickness = thickness;
            }
          }
        );

        /* Get start and end altitudes of the longest inflow layer */
        inflow = [sounding.getValueAt(inflowLayer![0], 'height'), 
                  sounding.getValueAt(inflowLayer![1], 'height')];

        /* Compute shear of inflow layer */
        return numerical.computeShear(fnWind, inflow[0], inflow[1]) / 1.852;
      }, name: "Bulk Shear Inflow (kt)"},

      {func: () => numerical.computeSTM(fnWind, zBegin(), 1)[0] / 1.852,
        name: "Bunkers STM (R) (kt)"},

      {func: () => numerical.computeSTM(fnWind, zBegin(), -1)[0] / 1.852,
        name: "Bunkers STM (L) (kt)"},

      {func: () => numerical.computeSREH(fnWind, zBegin(), zBegin() + 1000),
        name: "SReH (0-1 km) (m^2/s^2)"},

      {func: () => numerical.computeSREH(fnWind, zBegin(), zBegin() + 3000),
        name: "SReH (0-3 km) (m^2/s^2)"},

      {func: () => numerical.computeSREH(fnWind, inflow![0], inflow![1] + 3000),
          name: "SReH (Inflow) (m^2/s^2)"},

      {func: () => numerical.computeEHI(fnHeight, fnTemp, fnDewp, fnWind, pBegin(), pEnd(), 1000),
        name: "Energy Helicity Index 0-1km"},

      {func: () => numerical.computeEHI(fnHeight, fnTemp, fnDewp, fnWind, pBegin(), pEnd(), 3000),
        name: "Energy Helicity Index 0-3km"},

      {func: () => numerical.computeEHI(fnHeight, fnTemp, fnDewp, fnWind, pBegin(), pEnd(), inflow![1]),
        name: "Energy Helicity Index Inflow"},

      {func: () => numerical.computeSWEAT(fnTemp, fnDewp, fnSpd, fnDir),
        name: "SWEAT Index"}
    ];
  }

  /* Computes and prints indices */
  printIndices() {
    const indicesDiv = document.getElementById('sounding-indices-body')!;
    indicesDiv.replaceChildren();

    for (const index of this.indices) {
      const name = document.createElement("div");
      name.innerText = index.name;
      name.className = "sounding-indices-name-column";

      const value = document.createElement("div");
      try { value.innerText = index.func(this.sounding).toFixed(2); } 
      catch { value.innerText = "Undefined"; }
      value.className = "sounding-indices-value-column";

      const row = document.createElement("div");
      row.className = "sounding-indices-row";
      row.appendChild(name);
      row.appendChild(value);
      indicesDiv.appendChild(row);
    }
  }

  update() {
    this.printIndices();
  }
}