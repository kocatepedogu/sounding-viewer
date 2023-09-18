// SPDX-License-Identifier: GPL-3.0-or-later

import * as data from "./data"
import * as numerical from "./numerical"

type SoundingIndex = {
  /** func takes the sounding as argument and returns an index value */
  func: (sounding: data.Sounding) => number;
  /** Name gets printed as the label of the index */
  name: string;
}

export class IndexTable {
  private sounding: data.Sounding;

  private indices: SoundingIndex[] = [
    {func: () => {return numerical.computeCAPE(this.fnTemp(), this.fnDewp(),
      this.sounding.first().pressure, this.sounding.last().pressure)}, name: "CAPE"},

    {func: () => {return numerical.computeLiftedIndex(this.fnTemp(), this.fnDewp(), this.sounding.first().pressure)},
      name: "Lifted Index"},

    {func: () => {return numerical.computeK(this.fnTemp(), this.fnDewp())}, 
      name: "K Index"},

    {func: () => {return numerical.computeTT(this.fnTemp(), this.fnDewp())}, 
      name: "Totals Totals"},

    {func: () => {return numerical.computeBoyden(this.fnTemp(), this.fnHeight())}, 
      name: "Boyden Index"},

    {func: () => {return numerical.computeVT(this.fnTemp())}, 
      name: "Vertical Totals"},

    {func: () => {return numerical.computeCT(this.fnTemp(), this.fnDewp())}, 
      name: "Cross Totals"},

    {func: () => {return numerical.computeMJI(this.fnTemp(), this.fnDewp())}, 
      name: "Modified Jefferson Index"},

    {func: () => {return numerical.computeRackliff(this.fnTemp(), this.fnDewp())}, 
      name: "Rackliff Index"},

    {func: () => {return numerical.computeThompson(this.fnTemp(), this.fnDewp(), this.sounding.first().pressure)}, 
      name: "Thompson Index"},

    {func: () => {return numerical.computeShowalter(this.fnTemp(), this.fnDewp())}, 
      name: "Showalter Index"},

    {func: () => {return numerical.computeModifiedK(this.fnTemp(), this.fnDewp(), this.sounding.first().pressure)}, 
      name: "Modified K Index"},

    {func: () => {return numerical.computeModifiedTT(this.fnTemp(), this.fnDewp(), this.sounding.first().pressure)}, 
      name: "Modified Totals Totals"},

    {func: () => {return numerical.computeCII(this.fnTemp(), this.fnDewp(), this.sounding.first().pressure)}, 
      name: "Convective Instability Index"},

    {func: () => {return numerical.computeFSI(this.fnTemp(), this.fnDewp(), this.fnSpd(), this.sounding.first().pressure)}, 
      name: "Fog Stability Index"},

    {func: () => {return numerical.computeDCI(this.fnTemp(), this.fnDewp(), this.sounding.first().pressure)}, 
      name: "Deep Convective Index"},

    {func: () => {return numerical.computeKo(this.fnTemp(), this.fnDewp())}, 
      name: "Ko Index"},

    {func: () => {return numerical.computePII(this.fnTemp(), this.fnDewp(), this.fnHeight())}, 
      name: "Potential Instability Index"},

    {func: () => {return numerical.computeHumidityIndex(this.fnTemp(), this.fnDewp())}, 
      name: "Humidity Index"},
  ];

  constructor(sounding: data.Sounding) {
    this.sounding = sounding;
    this.sounding.addObserver(() => {
      this.update();
    });
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

  private fnTemp() {
    return (p: number) => {return this.sounding.getValueAt(p, 'temp');}
  }

  private fnDewp() {
    return (p: number) => {return this.sounding.getValueAt(p, 'dewpt');}
  }

  private fnSpd() {
    return (p: number) => {return this.sounding.getValueAt(p, 'windspd');}
  }

  private fnHeight() {
    return (p: number) => {return this.sounding.getValueAt(p, 'height');}
  }
}