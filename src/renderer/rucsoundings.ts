// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * This file contains functions for fetching and parsing GSD sounding format described in the link below.
 * https://rucsoundings.noaa.gov/raob_format.html
 * 
 * GSD data files for GFS are obtained from https://rucsoundings.noaa.gov
 */

import * as data from "./data"

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

export async function fetchGFS(params: URLSearchParams) {
  const lat = params.get('lat');
  const lon = params.get('lon');
  const hour = params.get('hour');

  if (!lat || !lon || !hour) {
    throw new Error("Missing parameters");
  }

  const fetchURL = 'https://rucsoundings.noaa.gov/get_soundings.cgi?' + new URLSearchParams({
    data_source: 'GFS',
    latest: 'latest',
    n_hrs: '1.0',
    fcst_len: hour,
    airport: lat + ',' + lon,
    hydrometeors: 'false',
    start: 'latest'
  });

  const result = await fetch(fetchURL);
  console.log(result);
  const text = await result.text();
  console.log(text);
  const gsd = await parse(text);
  console.log(gsd);

  return gsd;
}

export function fetchGSD(params: URLSearchParams): Promise<GSD> {
  const type = params.get('type');
  switch (type) {
    case 'gfs':
      return fetchGFS(params);
  }

  throw new Error("Unknown type");
}

export function example() {
  return parse(`
  GFS 03 h forecast valid for grid point 0.0 nm / 360 deg from 36,28:
GFS         21      10      Sep    2023
   CAPE    416    CIN   -144  Helic  99999     PW     36
      1  23062  99999  36.00 -28.00  99999  99999
      2  99999  99999  99999     35  99999  99999
      3           36,28                 12     kt
      9  10000     55    245    186    294      9
      4   9750    277    238    170    298      9
      4   9500    505    243    152    309      4
      4   9250    738    228    143    350      2
      4   9000    976    212    129    358      3
      4   8500   1469    181    104     29      3
      4   8000   1985    142     87     70      5
      4   7500   2527    103     50     66      5
      4   7000   3097     59      7     55      4
      4   6500   3699     15    -58     37      3
      4   6000   4340    -19   -118    333      2
      4   5500   5027    -61   -170    271      4
      4   5000   5767    -96   -353    268      8
      4   4500   6573   -142   -597    272     11
      4   4000   7456   -200   -311    249     18
      4   3500   8437   -244   -318    257     27
      4   3000   9544   -317   -367    253     39
      4   2500  10804   -417   -525    263     37
      4   2000  12283   -505   -643    253     59
      4   1500  14118   -600   -743    247     67
      4   1000  16617   -653   -822    246     38
      4    700  18800   -639   -851    221      4
      4    500  20877   -597   -883     11      5
      4    300  24128   -524   -908     89      4
      4    200  26776   -477   -936    110     11
      4    100  31391   -434  99999    102     23
      4     70  33800   -405  99999     79     14
      4     50  36117   -353  99999     67     23
      4     30  39730   -278  99999     77     22
      4     20  42699   -181  99999     63     25
      4     10  47992    -86  99999     59      9
  `)
}