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

import {} from './bundle.js';

const numerical = self.numerical;
const sounding = self.sounding;

let snd = undefined;
let CAPE, CIN, LFC, EL;
let MU, MUCAPE, MUCIN;
let inflow;

const functions = [
  () => {[CAPE, CIN, LFC, EL] = numerical.computeCAPE(fT, fTd, pBegin(), pEnd()); return CAPE}, () => CIN,
  () => Math.sqrt(2 * CAPE),
  () => snd.getValueAt(LFC, 'height'),
  () => snd.getValueAt(EL, 'height'),
  () => numerical.computeLiftedIndex(fT, fTd, pBegin()),
  () => MU=numerical.computeMostUnstable(fT, fTd, pBegin(), 500),
  () => {[MUCAPE, MUCIN] = numerical.computeCAPE(fT, fTd, MU, pEnd()).slice(0, 2); return MUCAPE}, () => MUCIN,
  () => numerical.computeLiftedIndex(fT, fTd, MU),
  () => numerical.computePW(fTd, pBegin(), pEnd()),
  () => numerical.computeK(fT, fTd),
  () => numerical.computeTT(fT, fTd),
  () => numerical.computeSoaring(fT, fTd),
  () => numerical.computeBoyden(fT, fZ),
  () => numerical.computeVT(fT),
  () => numerical.computeCT(fT, fTd),
  () => numerical.computeMJI(fT, fTd),
  () => numerical.computeRackliff(fT, fTd),
  () => numerical.computeThompson(fT, fTd, pBegin()),
  () => numerical.computeShowalter(fT, fTd),
  () => numerical.computeModifiedK(fT, fTd, pBegin()),
  () => numerical.computeModifiedTT(fT, fTd, pBegin()),
  () => numerical.computeCII(fT, fTd, pBegin()),
  () => numerical.computeFSI(fT, fTd, fnSpd, pBegin()),
  () => numerical.computeDCI(fT, fTd, pBegin()),
  () => numerical.computeKo(fT, fTd),
  () => numerical.computePII(fT, fTd, fZ),
  () => numerical.computeHumidityIndex(fT, fTd),
  () => {inflow = numerical.computeInflowLayer(fT, fTd, fZ, pBegin(), pEnd()); return inflow? inflow[0] : NaN}, 
  () => inflow ? inflow[1] : NaN,
  () => numerical.computeShear(fnWind, zBegin(), zBegin() + 1000) / 1.852,
  () => numerical.computeShear(fnWind, zBegin(), zBegin() + 3000) / 1.852,
  () => numerical.computeShear(fnWind, zBegin(), zBegin() + 6000) / 1.852,
  () => numerical.computeShear(fnWind, zBegin(), zBegin() + 8000) / 1.852,
  () => inflow? numerical.computeShear(fnWind, inflow[0], inflow[1]) / 1.852 : NaN,
  () => numerical.computeSTM(fnWind, zBegin(), 1)[0] / 1.852,
  () => numerical.computeSTM(fnWind, zBegin(), -1)[0] / 1.852,
  () => numerical.computeSREH(fnWind, zBegin(), zBegin() + 1000),
  () => numerical.computeSREH(fnWind, zBegin(), zBegin() + 3000),
  () => inflow? numerical.computeSREH(fnWind, inflow[0], inflow[1] + 3000) : NaN,
  () => numerical.computeEHI(fZ, fT, fTd, fnWind, pBegin(), pEnd(), 1000),
  () => numerical.computeEHI(fZ, fT, fTd, fnWind, pBegin(), pEnd(), 3000),
  () => inflow ? numerical.computeEHI(fZ, fT, fTd, fnWind, pBegin(), pEnd(), inflow[1]) : NaN,
  () => numerical.computeSWEAT(fT, fTd, fnSpd, fnDir),
  () => inflow ? numerical.computeSCP(fnWind, inflow[0], inflow[1], MUCAPE) : NaN
];

function fT(p) { return snd.getValueAt(p, 'temp') }
function fTd(p) { return snd.getValueAt(p, 'dewpt') }
function fnSpd(p) { return snd.getValueAt(p, 'windspd') }
function fnDir(p) { return snd.getValueAt(p, 'winddir') }
function fZ(p) { return snd.getValueAt(p, 'height') }
function fnWind(h) { return snd.getWindAt(h); }
function pBegin() { return snd.first().pressure; }
function pEnd() { return snd.last().pressure; }
function zBegin() { return snd.first().height; }

onmessage = function(e) {
  if (snd === undefined) {
    const rawData = JSON.parse(e.data);
    snd = Object.assign(Object.create(sounding.Sounding.prototype), rawData);
    snd.updateEnabledLevels();
    postMessage('initialized');
  }
  else {
    try {
      postMessage(functions[e.data]());
    } catch (err) {
      postMessage(NaN);
    }
  }
};