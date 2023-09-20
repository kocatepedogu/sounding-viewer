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

import { Sounding } from "./sounding";
import * as numerical from "./numerical";

export class LevelDetails {
  private snd: Sounding;
  private pres: number;
  private element: HTMLTextAreaElement;

  constructor(snd: Sounding) {
    this.element = <HTMLTextAreaElement>document.getElementById('sounding-level-details-text')!;
    this.snd = snd;
    this.pres = this.snd.first().pressure;
    this.snd.addObserver(() => {this.update();});
    this.update();
  }

  setLevel(pres: number) {
    this.pres = pres;
    this.update();
  }

  update() {
    let result = '';

    const pres = this.pres;
    const height = this.snd.getValueAt(pres, 'height');
    const temp = this.snd.getValueAt(pres, 'temp');
    const dewpt = this.snd.getValueAt(pres, 'dewpt');
    const e = numerical.vaporPressure(dewpt);
    const es = numerical.saturatedVaporPressure(temp);
    const w = numerical.mixingRatio(dewpt, pres);
    const ws = numerical.saturatedMixingRatio(temp, pres);
    const rh = numerical.relativeHumidity(temp, dewpt, pres);
    const spec = numerical.specificHumidityFromMixingRatio(w);
    const tv = numerical.virtualTemperature(temp, dewpt, pres);
    const theta = numerical.potentialTemperature(temp, pres);
    const thetae = numerical.equivalentPotentialTemperature(temp, dewpt, pres);
    const twet = numerical.wetBulbTemperature(temp, dewpt, pres);

    result += `Pressure: ${pres.toFixed(1)} mb\n`;
    result += `Height: ${height.toFixed(1)} m\n`;
    result += `Temperature: ${temp.toFixed(2)} degC\n`;
    result += `Dewpoint Temperature: ${dewpt.toFixed(2)} degC\n`;
    result += `Virtual Temperature: ${tv.toFixed(2)} degC\n`;
    result += `Potential Temperature: ${theta.toFixed(2)} degC\n`;
    result += `Equivalent Potential Temperature: ${thetae.toFixed(2)} degC\n`;
    result += `Wet bulb Temperature: ${twet.toFixed(2)} degC\n`;
    result += `Vapor Pressure: ${e.toFixed(1)} mb\n`;
    result += `Saturated Vapor Pressure: ${es.toFixed(1)} mb\n`;
    result += `Mixing Ratio: ${w.toFixed(1)} g/kg\n`;
    result += `Saturated Mixing Ratio: ${ws.toFixed(1)} g/kg\n`;
    result += `Relative Humidity: ${(rh * 100).toFixed(1)}%\n`;
    result += `Specific Humidity: ${(spec).toFixed(1)} g/kg\n`;

    this.element.value = result;
  }
}