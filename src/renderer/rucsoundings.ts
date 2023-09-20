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
 */

import { GSD } from './gsd'

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
  const text = await result.text();

  return GSD.parse(text);
}

export function fetchData(params: URLSearchParams): Promise<GSD> {
  const type = params.get('type');
  switch (type) {
    case 'gfs':
      return fetchGFS(params);
  }

  throw new Error("Unknown type");
}

export function example() {
  return GSD.parse(`
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