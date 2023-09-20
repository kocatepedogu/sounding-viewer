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

/**
 * This file contains functions for fetching and parsing GSD sounding format described in the link below.
 * https://rucsoundings.noaa.gov/raob_format.html
 * 
 * GSD data files for GFS are obtained from https://rucsoundings.noaa.gov
 */

import * as data from "./sounding"

export function parseIntValue(value: string) {
  if (value == '99999') {
    return NaN;
  } else {
    return parseInt(value);
  }
}

export function parseFloatValue(value: string) {
  if (value == '99999') {
    return NaN;
  } else {
    return parseFloat(value);
  }
}

export enum LineType {
  StationIdentificationLine = 1,
  SoundingChecksLine = 2,
  StationIdentifierOtherIndicatorsLine = 3,
  MandatoryLevel = 4,
  SignificantLevel = 5,
  WindLevel = 6,
  TropopauseLevel = 7,
  MaximumWindLevel = 8,
  SurfaceLevel = 9,
}

export enum Source {
  /** National Climatic Data Center (NCDC) */
  NCDC = 0,
  /** Atmospheric Environment Service (AES), Canada */
  AES = 1,
  /** National Severe Storms Forecast Center (NSSFC) */
  NSSFC = 2,
  /** GTS or GSD GTS data only */
  GTS = 3,
  /** merge of NCDC and GTS data (sources 2,3 merged into sources 0,1) */
  NCDCandGTS = 4,
}

export enum RadiosondeType {
  /** VIZ "A" type radiosonde */
  VIZA = 10,
  /** VIZ "B" type radiosonde */
  VIZB = 11,
  /** Space data corp.(SDC) radiosonde. */
  SDC = 12,
}

export enum WindSpeedUnits {
  MetersPerSecond = 'ms',
  Knots = 'kt',
}

export type TypeAndDate = {
  readonly type: string;
  readonly hour: number;
  readonly day: number;
  readonly month: string;
  readonly year: number;
}

export type StationIdentification = {
  readonly wban: number;
  readonly wmo: number;
  readonly lat: number;
  readonly lon: number;
  readonly elev: number;
  readonly rtime: number;
}

export type SoundingChecks = {
  readonly hydro: number;
  readonly mxwd: number;
  readonly tropl: number;
  readonly lines: number;
  readonly tindex: number;
  readonly source: number;
}

export type StationIdentifierOtherIndicators = {
  readonly staid: string;
  readonly sonde: RadiosondeType;
  readonly wsunits: WindSpeedUnits;
}

export type Header =
  | TypeAndDate
  | StationIdentification
  | SoundingChecks
  | StationIdentifierOtherIndicators;

export type Level = {
  /** Type of level */
  readonly lineType: LineType;
  /** Pressure in milibars (mb) */
  readonly pressure: number;
  /** Height in meters (m) */
  readonly height: number;
  /** Temperature in Celsius */
  readonly temp: number;
  /** Dewpoint temperature in Celsius */
  readonly dewpt: number;
  /** Wind direction in degrees */
  readonly winddir: number;
  /** Wind speed (unit is given in Header.wsunits) */
  readonly windspd: number;
  /** 'Hour and minute (UTC) that this data line was taken' */
  readonly hmmm: unknown;
  /** 'Bearing from the ground point for this level' */
  readonly bearing: unknown;
  /** 'Range (nautical miles) from the ground point for this level.' */
  readonly range: unknown;
}

export class GSD implements Iterable<data.LevelSource> {
  readonly header: Array<Header> = [];
  readonly levels: Array<Level> = [];

  constructor(header: Array<Header>, levels: Array<Level>) {
    Object.assign(this.header, header);
    Object.assign(this.levels, levels);
  }

  *[Symbol.iterator]() {
    for (const level of this.levels) {
      yield <data.LevelSource>level;
    }
  }
}

export function parse(input: string): Promise<GSD> {
  return new Promise(function (resolve, reject) {
    try {
      const lines = input.split('\n');
      const levels: Array<Level> = [];
      const header: Array<Header> = [];

      let levelIndex = 0;
      let headerIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        const words: string[] = lines[i].trim().split(/\s+/);
        if (Number(words[0])) {
          const lineType: LineType = parseInt(words[0]);

          switch (lineType) {
            case LineType.StationIdentificationLine:
              header[headerIndex++] = {
                wban: parseIntValue(words[1]),
                wmo: parseIntValue(words[2]),
                lat: parseFloatValue(words[3]),
                lon: parseFloatValue(words[4]),
                elev: parseFloatValue(words[5]),
                rtime: parseIntValue(words[6])
              };
              break;

            case LineType.SoundingChecksLine:
              header[headerIndex++] = {
                hydro: parseIntValue(words[1]),
                mxwd: parseIntValue(words[2]),
                tropl: parseIntValue(words[3]),
                lines: parseIntValue(words[4]),
                tindex: parseIntValue(words[5]),
                source: parseIntValue(words[6])
              }
              break;

            case LineType.StationIdentifierOtherIndicatorsLine:
              header[headerIndex++] = {
                staid: words[1],
                sonde: RadiosondeType[words[2] as keyof typeof RadiosondeType],
                wsunits: WindSpeedUnits[words[3] as keyof typeof WindSpeedUnits]
              }
              break;

            default: {
              levels[levelIndex++] = {
                lineType: lineType,
                pressure: parseIntValue(words[1]) / 10,
                height: parseIntValue(words[2]),
                temp: parseIntValue(words[3]) / 10,
                dewpt: parseIntValue(words[4]) / 10,
                winddir: parseIntValue(words[5]),
                windspd: parseIntValue(words[6]),
                hmmm: words[7],
                bearing: words[8],
                range: words[9]
              }
              break;
            }
          }
        }
      }
      
      resolve(new GSD(header, levels));
    } catch (e) {
      return reject(e);
    }
  });
}