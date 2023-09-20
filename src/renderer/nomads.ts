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

import { LevelSource } from "./sounding";
import * as numerical from './numerical';

enum GRIBLevelType {
  PressureLevel,
  MetersAboveGround,
  Surface
}

type GRIBLevel = {
  levelType: GRIBLevelType,
  value: number
}

enum GRIBValueType {
  Pressure,
  Height,
  Temperature,
  Dewpoint,
  RelativeHumidity,
  CAPE,
  LiftedIndex,
  WindUComponent,
  WindVComponent = 'V'
}

type GRIBValue = number;

class GRIBData {
  private map: Map<string, number>;

  constructor() {
    this.map = new Map<string, number>();
  }

  put(level: GRIBLevel, dataType: GRIBValueType, value: GRIBValue) {
    this.map.set(JSON.stringify({
      level: level,
      dataType: dataType
    }), value);
  }

  get(level: GRIBLevel, dataType: GRIBValueType) {
    const value = this.map.get(JSON.stringify({
      level: level,
      dataType: dataType
    }));

    if (value === undefined) {
      throw new Error("Undefined value is found");
    }

    return value;
  }

  forEach(fncallback: (level: GRIBLevel, dataType: GRIBValueType, value: GRIBValue) => void): void {
    this.map.forEach((value: number, key: string) => {
      const {level, dataType} = JSON.parse(key);
      fncallback(level, dataType, value);
    })
  }

  toSoundingSource() {
    /* Construct surface level */
    const surfaceLevel = {levelType: GRIBLevelType.Surface, value: 0};
    const above2mLevel = {levelType: GRIBLevelType.MetersAboveGround, value: 2};
    const above10mLevel = {levelType: GRIBLevelType.MetersAboveGround, value: 10};
    const u10m = this.get(above10mLevel, GRIBValueType.WindUComponent);
    const v10m = this.get(above10mLevel, GRIBValueType.WindVComponent);
    const firstLevel: LevelSource = {
      pressure: parseFloat((this.get(surfaceLevel, GRIBValueType.Pressure) / 100).toFixed(0)),
      height: parseFloat((this.get(surfaceLevel, GRIBValueType.Height)).toFixed(0)),
      temp: parseFloat((this.get(above2mLevel, GRIBValueType.Temperature) - 273.15).toFixed(2)),
      dewpt: parseFloat((this.get(above2mLevel, GRIBValueType.Dewpoint) - 273.15).toFixed(2)),
      winddir: parseFloat(numerical.windDirection(u10m, v10m).toFixed(0)),
      windspd: parseFloat((numerical.windSpeed(u10m, v10m) * 3.6).toFixed(0))
    }

    /* The first level in the result is the surface level */
    const result = [firstLevel];

    /* Determine the pressure levels available in the data */
    const pressureValueSet = new Set<number>();
    this.forEach((level) => {
      if (level.levelType == GRIBLevelType.PressureLevel) {
        pressureValueSet.add(level.value);
      }
    });

    /* Eliminate pressure levels that are below the surface and sort the levels in decreasing order */
    const pressureValues = [...pressureValueSet.values()].filter(p => p < firstLevel.pressure).sort((a, b) => b - a);

    /* Construct upper pressure levels */
    for (const pressureValue of pressureValues) {
      const pressureLevel = {levelType: GRIBLevelType.PressureLevel, value: pressureValue };
      const u = this.get(pressureLevel, GRIBValueType.WindUComponent);
      const v = this.get(pressureLevel, GRIBValueType.WindVComponent);
      const tmp = this.get(pressureLevel, GRIBValueType.Temperature) - 273.15;
      const rh = this.get(pressureLevel, GRIBValueType.RelativeHumidity) / 100;
      const dpt = numerical.dewpointTemperature(tmp, rh);

      result.push({
        pressure: parseFloat(pressureValue.toFixed(0)),
        height: parseFloat((this.get(pressureLevel, GRIBValueType.Height)).toFixed(0)),
        temp: parseFloat(tmp.toFixed(2)),
        dewpt: parseFloat(dpt.toFixed(2)),
        winddir: parseFloat(numerical.windDirection(u, v).toFixed(0)),
        windspd: parseFloat((numerical.windSpeed(u, v) * 3.6).toFixed(0))
      });
    }
    
    return result;
  }
}

export async function fetchGRIB(params: URLSearchParams): Promise<Iterable<LevelSource>> {
  /* Get parameters from previous page */
  const runTimeStr = params.get('runTime');
  const runDateStr = params.get('runDate');
  const hourStr = params.get('hour');
  const latStr = params.get('lat');
  const lonStr = params.get('lon');

  if (!latStr || !lonStr || !hourStr || !runTimeStr || !runDateStr) {
    throw new Error("Missing parameters");
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  /* Download corresponding data using GRIB filter */
  const result = await downloadGRIB(runTimeStr, runDateStr, lat, lon, hourStr);
  if (result instanceof Error) {
    throw new Error("Cannot connect to data server.\n" + result.message);
  }

  /* Convert GRIB2 to CSV using wgrib2 */
  const lines = await window.IO.wgrib2('data.grib2');
  if (lines instanceof Error) {
    throw new Error("wgrib2 failed.\n" + lines.message);
  }

  /* Find coordinate boundaries of data */
  const {latMin, lonMin, xdim, ydim} = findBoundaries(lines);

  /* Store data in a 2D grid */
  const data2d = getGrid(latMin, lonMin, xdim, ydim, lines);

  /* Find values at the given coordinates using linear interpolation */
  const interpolated = interpolate(data2d, lat, lon, latMin, lonMin);

  /* Convert data to a sounding source and return it */
  return interpolated.toSoundingSource();
}

async function downloadGRIB(runTimeStr: string, runDateStr: string, lat: number, lon: number, hourStr: string) {
  const fetchURL = 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?' + new URLSearchParams({
    dir: `/gfs.${runDateStr}/${runTimeStr}/atmos`,
    file: `gfs.t${runTimeStr}z.pgrb2.0p25.f${hourStr}`,
    var_CAPE: 'on', var_DPT: 'on',
    var_HGT: 'on', var_LFTX: 'on',
    var_PRES: 'on', var_PWAT: 'on',
    var_RH: 'on', var_TMP: 'on',
    var_UGRD: 'on', var_VGRD: 'on',
    lev_2_m_above_ground: 'on', lev_10_m_above_ground: 'on',
    lev_1000_mb: 'on', lev_975_mb: 'on', lev_950_mb: 'on', lev_925_mb: 'on',
    lev_900_mb: 'on', lev_850_mb: 'on', lev_800_mb: 'on', lev_750_mb: 'on',
    lev_700_mb: 'on', lev_650_mb: 'on', lev_600_mb: 'on', lev_550_mb: 'on',
    lev_500_mb: 'on', lev_450_mb: 'on', lev_400_mb: 'on', lev_350_mb: 'on',
    lev_300_mb: 'on', lev_250_mb: 'on', lev_200_mb: 'on', lev_150_mb: 'on',
    lev_100_mb: 'on', lev_70_mb: 'on', lev_50_mb: 'on', lev_40_mb: 'on',
    lev_30_mb: 'on', lev_20_mb: 'on', lev_15_mb: 'on', lev_10_mb: 'on',
    lev_7_mb: 'on', lev_5_mb: 'on', lev_3_mb: 'on', lev_2_mb: 'on',
    lev_1_mb: 'on', lev_surface: 'on',
    subregion: '',
    toplat: (lat + 1).toString(),
    leftlon: (lon - 1).toString(),
    rightlon: (lon + 1).toString(),
    bottomlat: (lat - 1).toString()
  });

  return await window.IO.downloadFromHTTPS(fetchURL, "data.grib2");
}

function findBoundaries(lines: string[][]) {
  let latMin = Number.MAX_VALUE;
  let latMax = Number.MIN_VALUE;
  let lonMin = Number.MAX_VALUE;
  let lonMax = Number.MIN_VALUE;
  lines.forEach((element: string[]) => {
    const lon = parseFloat(element[2]);
    const lat = parseFloat(element[3]);
    if (lon < lonMin) lonMin = lon;
    if (lon > lonMax) lonMax = lon;
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
  });

  const xdim = Math.ceil((lonMax - lonMin) / 0.25) + 1;
  const ydim = Math.ceil((latMax - latMin) / 0.25) + 1;

  return {latMin, lonMin, xdim, ydim};
}

function getGrid(latMin: number, lonMin: number, xdim: number, ydim: number, lines: string[][]) {
  const data2d: GRIBData[][] = [];
  for (let i = 0; i < ydim; i++) {
    data2d.push([]);
    for (let j = 0; j < xdim; j++) {
      data2d[i].push(new GRIBData());
    }
  }
  
  lines.forEach((element: string[]) => {
    if (element.length == 0) {
      return;
    }

    try {
      const dataType = parseDataTypeString(element[0]);
      const level = parseLevelString(element[1]);
      const x = Math.round((parseFloat(element[2]) - lonMin) / 0.25);
      const y = Math.round((parseFloat(element[3]) - latMin) / 0.25);
      const value = parseFloat(element[4])
      
      data2d[y][x].put(level, dataType, value)
    } catch (error) {
      console.log('A line with unrecognized type of data is found in wgrib2 output. Unknown data is ignored.');
      console.log(error);
    }
  });

  return data2d;
}

function parseDataTypeString(dataTypeString: string): GRIBValueType {
  switch (dataTypeString) {
    case 'PRES': return GRIBValueType.Pressure;
    case 'HGT': return GRIBValueType.Height;
    case 'TMP': return GRIBValueType.Temperature;
    case 'DPT': return GRIBValueType.Dewpoint;
    case 'RH': return GRIBValueType.RelativeHumidity;
    case 'UGRD': return GRIBValueType.WindUComponent;
    case 'VGRD': return GRIBValueType.WindVComponent;
    case 'CAPE': return GRIBValueType.CAPE;
    case 'LFTX': return GRIBValueType.LiftedIndex;
  }

  throw new Error("Unknown data type " + dataTypeString);
}

function parseLevelString(levelString: string): GRIBLevel {
  if (levelString.indexOf('surface') >= 0) {
    return {
      levelType: GRIBLevelType.Surface, 
      value: 0
    };
  } 

  if (levelString.indexOf('mb') >= 0) {
    return {
      levelType: GRIBLevelType.PressureLevel,
      value: parseInt(levelString.split(' ')[0])
    };
  } 
  
  if (levelString.indexOf('above ground') >= 0) {
    return {
      levelType: GRIBLevelType.MetersAboveGround,
      value: parseInt(levelString.split(' ')[0])
    };
  }

  throw new Error("Unknown level type " + levelString);
}

function interpolate(data2d: GRIBData[][], lat:number, lon:number, latMin:number, lonMin:number) {
  const x = (lon - lonMin) / 0.25; 
  const ix = Math.floor(x);
  const rx = x % 1;
  const y = (lat - latMin) / 0.25;
  const iy = Math.floor(y);
  const ry = y % 1;

  const upper = new GRIBData();
  data2d[iy + 1][ix].forEach((level, dataType, value) => {
    const nextValue = data2d[iy+1][ix+1].get(level, dataType)!;
    upper.put(level, dataType, value * (1 - rx) + nextValue * rx);
  });

  const lower = new GRIBData();
  data2d[iy][ix].forEach((level, dataType, value) => {
    const nextValue = data2d[iy][ix+1].get(level, dataType)!;
    lower.put(level, dataType, value * (1 - rx) + nextValue * rx);
  });

  const interpolated = new GRIBData();
  lower.forEach((level, dataType, value) => {
    const nextValue = upper.get(level, dataType)!;
    interpolated.put(level, dataType, value * (1 - ry) + nextValue * ry);
  });

  return interpolated;
}