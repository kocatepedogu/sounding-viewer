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
 * @param u-component of wind
 * @param v-component of wind
 * @returns Wind direction in degrees
 */
export function windDirection(u:number, v:number): number {
  const deg = -Math.atan2(v, u) * 180 / Math.PI - 90;
  return deg < 0 ? deg + 360 : deg;
}

/**
 * @param u-component of wind
 * @param v-component of wind
 * @returns Wind speed (in the same unit as arguments)
 */
export function windSpeed(u:number, v:number): number {
  return Math.sqrt(u**2 + v**2);
}

/** 
  @param Td Dewpoint temperature in Celsius
  @returns Vapor pressure in mb/hPa
*/
export function vaporPressure(Td: number): number {
  return 6.11 * 10**((7.5 * Td) / (237.3 + Td));
}

/** 
  @param T Temperature in Celsius
  @returns Saturated vapor pressure in mb/hPa
*/
export function saturatedVaporPressure(T: number): number {
  return 6.11 * 10**((7.5 * T) / (237.3 + T));
}

/**
 * @param e Vapor pressure in mb/hPa
 * @param Psta Station pressure in mb/hPa
 * @returns Mixing ratio (g/kg)
 */
export function mixingRatioFromVaporPressure(e: number, Psta: number): number {
  return 621.97 * (e / (Psta - e));
}

/**
 * @param Td Dewpoint temperature in Celsius
 * @param Psta Station pressure in mb/hPa
 * @returns Mixing ratio (g/kg)
 */
export function mixingRatio(Td: number, Psta: number): number {
  const e = vaporPressure(Td);
  return mixingRatioFromVaporPressure(e, Psta);
}

/**
 * @param Td Temperature in Celsius
 * @param Psta Station pressure in mb/hPa
 * @returns Mixing ratio (g/kg)
 */
export function saturatedMixingRatio(T: number, Psta: number): number {
  const e = saturatedVaporPressure(T);
  return mixingRatioFromVaporPressure(e, Psta);
}

/**
 * @param T Temperature in Celsius
 * @param Td Dewpoint temperature in Celsius
 * @param Psta Station pressure in mb/hPa
 * @returns Relative Humidity (a unitless value between 0 and 1)
 */
export function relativeHumidity(T: number, Td: number, Psta: number): number {
  const w = mixingRatio(Td, Psta);
  const ws = saturatedMixingRatio(T, Psta);
  return w/ws;
}

/**
 * @param T Temperature in Celsius
 * @param RH Relative Humidity (a unitless value between 0 and 1)
 * @returns Dewpoint temperature in Celsius
 */
export function dewpointTemperature(T: number, RH: number): number {
  const es = saturatedVaporPressure(T);
  const A = 237.3 * Math.log(es * RH / 6.11);
  const B = 7.5 * Math.log(10) - Math.log(es * RH / 6.11);
  return A / B;
}

/**
 * @param rv Mixing ratio in g/kg
 * @returns Specific humidity in g/kg
 */
export function specificHumidityFromMixingRatio(rv: number): number {
  rv /= 1000; // Mixing ratio 
  return 1000 * rv / (1 + rv);
}

/**
 * @param Td Dewpoint temperature in Celsius
 * @param Psta Station pressure in mb/hPa
 * @returns Specific humidity in g/kg
 */
export function specificHumidity(Td: number, Psta: number) {
  return specificHumidityFromMixingRatio(mixingRatio(Td, Psta));
}

/**
 * @param T Temperature in Celsius
 * @param Td Dewpoint temperature in Celsius
 * @param Psta Station pressure in mb/hPa
 * @returns Virtual temperature in Celsius
 */
export function virtualTemperature(T: number, Td: number, Psta: number): number {
  const e = vaporPressure(Td);
  return (T + 273.15) / (1 - 0.379 * (e / Psta)) - 273.15;
}

/**
 * @param T Temperature in Celsius
 * @param P0 Reference Pressure in mb/hPa
 * @param Pressure in mb/hPa
 * @returns Potential temperature in Celsius
 */
export function potentialTemperature(T: number, P: number, P0: number = 1000): number {
  return (T + 273.15) * (P0/P)**0.286 - 273.15;
}

/**
 * Computes equivalent potential temperature using the Bolton formulas.
 * Formula (15) is used for computing temperature at LCL.
 * Formula (43) is used for computing equivalent potential temperature in Kelvin.
 * Result is converted to Celsius.
 * https://doi.org/10.1175/1520-0493(1980)108%3C1046:TCOEPT%3E2.0.CO;2
 * 
 * @param T Temperature in Celsius
 * @param Td Dewpoint Temperature in Celsius
 * @param P Pressure in mb/hPa
 * @param P0 Reference pressure in mb/hPa
 * @returns Equivalent potential temperature in celsius
 */
export function equivalentPotentialTemperature(T: number, Td: number, P: number, P0: number = 1000): number {
  const TK = T + 273.15; // Temperature in Kelvin
  const TD = Td + 273.15; // Dewpoint temperature in Kelvin
  const r = mixingRatio(Td, P) / 1000; // Mixing ratio (kg/kg)

  const TL = 1 / (1/(TD-56) + Math.log(TK/TD)/800) + 56; // Temperature at LCL in Kelvin
  const ThetaE = TK * (P0/P)**(0.2854*(1 - 0.28*r)) * Math.exp((3.376/TL - 0.00254) * r * 1000 * (1 + 0.81 * r))

  return ThetaE - 273.15;
}

/**
 * Computes wet bulb temperature
 * @param T Temperature in Celsius
 * @param Td Dewpoint temperature in Celsius
 * @param P Pressure in mb/hPa
 * @returns Wet bulb temperature in Celsius
 */
export function wetBulbTemperature(T: number, Td: number, P: number): number {
  const psychrometricConstant = 0.000665 * P / 10;

  let Twet = 0;
  for (let i = 0; i < 50; i++) {
    const tw_td_average = (Twet + Td) / 2;
    const es_tw_td_average = saturatedVaporPressure(tw_td_average) / 10;
    const delta = 17.502*240.97*es_tw_td_average/(240.97+tw_td_average)**2;

    Twet = (psychrometricConstant * T + delta * Td) / (delta + psychrometricConstant);
  }

  return Twet;
}

/**
 * Computes temperature at the LCL
 * @param T Temperature (Celsius)
 * @param Td Dewpoint temperature (Celsius)
 * @returns Temperature in Celsius at the lifted condensation level
 */
export function liftedCondensationLevelTemp(T: number, Td: number): number {
  if (T < Td) {
    throw new Error("Temperature cannot be less than dewpoint temperature.");
  }

  const TK = T + 273.15; // Temperature in Kelvin
  const TD = Td + 273.15; // Dewpoint temperature in Kelvin
  const TL = 1 / (1/(TD-56) + Math.log(TK/TD)/800) + 56;

  return TL - 273.15;
}

/**
 * Computes pressure of the LCL
 * @param P Pressure (mb/hPa)
 * @param T Temperature (Celsius)
 * @param Td Dewpoint temperature (Celsius)
 * @returns Pressure in mb/hPa at the LCL
 */
export function liftedCondensationLevel(P: number, T: number, Td:number): number {
  const TL = liftedCondensationLevelTemp(T, Td) + 273.15;
  const Theta = potentialTemperature(T, P) + 273.15;
  return 1000 * (TL/Theta) ** 3.48;
}

/**
 * Computes thickness using hypsometric equation.
 * @param Pbottom Pressure at the bottom of the layer (mb/hPa)
 * @param Ptop Pressure at the top of the layer (mb/hPa)
 * @param fT A function that returns the temperature (Celsius) at a given pressure level (mb/hPa)
 * @param fTd A function that returns the dewpoint (Celsius) at a given pressure level (mb//hPa)
 * @param Thickness in meters
 */
export function hypsometricEquation(
  Pbottom: number, 
  Ptop: number, 
  fT: (P:number) => number, 
  fTd: (P: number) => number) {
    const Rd = 287; // Specific gas constant of dry air (J/(kg*K))
    const g0 = 9.8076; // Gravitational acceleration (m/s^2)
    
    let p = Pbottom;
    const dp = 0.2;
    let Z = 0;
    while (p >= Ptop) {
      const T = fT(p);
      const Td = fTd(p);
      const TV = virtualTemperature(T, Td, p) + 273.15;

      Z += (Rd/g0) * TV * dp/p;
      p -= dp;
    }

    return Z;
}

/**
 * Computes moist adiabatic lapse rate
 */
export function moistAdiabaticLapseRate(T: number, P: number): number {
  const g = 9.8076; // Gravitational acceleration (m/s^2)
  const Hv = 2501000; // Heat of vaporization of water vapour (J/kg)
  const Rsw = 461.5; // Specific gas constant of water vapour (J/(kg*K))
  const Rsd = 287; // Specific gas constant of dry air (J/(kg*K))
  const cpd = 1003.5; // Specific heat of dry air at constant pressure (J/(kg*K))

  const TK = T + 273.15; // Temperature in Kelvin
  const r = saturatedMixingRatio(T, P) / 1000; // Saturated mixing ratio in kg/kg
  
  const X = 1 + (Hv * r) / (Rsd * TK);
  const Y = cpd + (Hv * Hv * r) / (Rsw * TK * TK);
  const gammaW = g * X/Y;

  return gammaW;
}

/**
 * Lifts saturated air parcel with moist adiabatic lapse rate
 * @param Tinitial Initial temperature of the saturated parcel in Celsius
 * @param Pinitial Initial pressure of the saturated parcel in mb/hPa
 * @param Pend Iteration finishes when the pressure reaches this value (mb/hPa)
 * @param deltaP Pressure increment used in the iteration (mb/hPa)
 */
export function* liftSaturatedParcel(Tinitial: number, Pinitial: number, Pend: number, deltaP=5) {
  let P = Pinitial;
  let T = Tinitial;
  
  while (P >= Pend && P >= deltaP) {
    const fT = () => {return T};
    const deltaZ = hypsometricEquation(P, P - deltaP, fT, fT);
    const lapseRate = moistAdiabaticLapseRate(T, P);
    const deltaT = lapseRate * deltaZ;

    T -= deltaT;
    P -= deltaP;

    yield [P, T];
  }
}

/**
 * Lifts unsaturated air parcel with dry adiabatic lapse rate
 * @param Tinitial Initial temperature of the parcel in Celsius
 * @param Pinitial Initial pressure of the saturated parcel in mb/hPa
 * @param Pend Iteration finishes when the pressure reaches this value (mb/hPa)
 * @param deltaP Pressure decrement used in the iteration (mb/hPa)
 */
export function* liftDryParcel(Tinitial: number, Pinitial: number, Pend: number, deltaP=5) {
  const TK = Tinitial + 273.15;

  let P = Pinitial;
  while (P >= Pend && P >= deltaP) {
    P -= deltaP;

    yield [P, TK/(Pinitial/P)**0.286 - 273.15];
  }
}

/**
 * Lifts a parcel adiabatically up to the given pressure level. It uses dry lapse rate below the
 * LCL and moist lapse rate above the LCL.
 * 
 * @param Tinitial Initial temperature of the parcel. (Celsius)
 * @param Pinitial Initial pressure of the parcel. (mb/hPa)
 * @param Pend Lifting ends at this pressure level. (mb/hPa)
 * @param LCL Pressure of the lifted condensation level (mb/hPa)
 * @param deltaP Pressure decrement used in the iteration (mb/hPa)
 */
export function* liftParcel(Tinitial: number, Pinitial: number, Pend: number, LCL: number, deltaP=5) {
  let lastT = NaN;
  for (const [P, T] of liftDryParcel(Tinitial, Pinitial, LCL, deltaP)) {
    lastT = T;
    yield [P, T];
  }

  yield* liftSaturatedParcel(lastT, LCL, Pend, deltaP);
}

/**
 * Returns a value from the sounding data where pressure is equal to p.
 */
export type ValueAccessor = (p: number) => number;

/** Computes Convective Available Potential Energy */
export function computeCAPE(fT: ValueAccessor, fTd: ValueAccessor, Pbegin: number, Pend: number, Pstep: number = 1) {
  const R = 287;
  const LCL = liftedCondensationLevel(Pbegin, fT(Pbegin), fTd(Pbegin)); // LCL (mb/hPa)

  let CAPE = 0;
  let prevPressure = Pbegin;
  for (const [P, Tp] of liftParcel(fT(Pbegin), Pbegin, Pend, LCL, Pstep)) {
    if (P < Pend) {
      break;
    }

    const T = fT(P);
    const Td = fTd(P);
    const Tv = virtualTemperature(T, Td, P);

    const Tdp = P >= LCL ? Tp : Td;
    const Tvp = virtualTemperature(Tp, Tdp, P);

    const newCAPE = R * (Tvp - Tv) * (Math.log(prevPressure) - Math.log(P));

    CAPE += newCAPE > 0 ? newCAPE : 0;
    prevPressure = P;
  }

  return CAPE;
}

/** Computes Lifted Index */
export function computeLiftedIndex(fT: ValueAccessor, fTd: ValueAccessor, Pbegin: number) {
  const LCL = liftedCondensationLevel(Pbegin, fT(Pbegin), fTd(Pbegin));
  let Tv500 = NaN;
  for (const [_, T] of liftParcel(fT(Pbegin), Pbegin, 500, LCL, 1)) {
    Tv500 = T; _;
  }
  return fT(500) - Tv500;
}

/** Computes K Index */
export function computeK(fT: ValueAccessor, fTd: ValueAccessor) {
  return fT(850) + fTd(850) + fTd(700) - fT(700) - fT(500);
}

/** Computes Totals Totals */
export function computeTT(fT: ValueAccessor, fTd: ValueAccessor) {
  return fT(850) + fTd(850) - 2*fT(500);
}

/** Computes Boyden Index */
export function computeBoyden(fT: ValueAccessor, fZ: ValueAccessor) {
  return (fZ(700)/10 - fZ(1000)/10) - fT(700) - 200;
}

/** Computes Vertical Totals */
export function computeVT(fT: ValueAccessor) {
  return fT(850) - fT(500);
}

/** Computes Cross Totals */
export function computeCT(fT: ValueAccessor, fTd: ValueAccessor) {
  return fTd(850) - fT(500);
}

/** Computes Modified Jefferson Index */
export function computeMJI(fT: ValueAccessor, fTd: ValueAccessor) {
  const thetaw850 = wetBulbTemperature(fT(850), fTd(850), 850);
  return 1.6 * thetaw850 - fT(500) - 0.5 * (fT(700) - fTd(700));
}

/** Computes Rackliff Index */
export function computeRackliff(fT: ValueAccessor, fTd: ValueAccessor) {
  const thetaw850 = wetBulbTemperature(fT(850), fTd(850), 850);
  return thetaw850 - fT(500);
}

/** Computes Thompson Index */
export function computeThompson(fT: ValueAccessor, fTd: ValueAccessor, Pbegin: number) {
  const LI = computeLiftedIndex(fT, fTd, Pbegin);
  const K = computeK(fT, fTd);
  return K - LI;
}

/** Computes Showalter Index */
export function computeShowalter(fT: ValueAccessor, fTd: ValueAccessor) {
  const LCL = liftedCondensationLevel(850, fT(850), fTd(850));
  let Tv500 = NaN;
  for (const [_, T] of liftParcel(fT(850), 850, 500, LCL, 1)) {
    Tv500 = T; _;
  }

  return fT(500) - Tv500;
}

/** Computes Modified K Index */
export function computeModifiedK(fT: ValueAccessor, fTd: ValueAccessor, Pbegin: number) {
  const Tsfc = fT(Pbegin);
  const Tdsfc = fTd(Pbegin);
  return (Tsfc - fT(500)) + Tdsfc - (fT(700) - fTd(700));
}

/** Computes Modified Totals Totals */
export function computeModifiedTT(fT: ValueAccessor, fTd: ValueAccessor, Pbegin: number) {
  const Tsfc = fT(Pbegin);
  const Tdsfc = fTd(Pbegin);
  return Tsfc + Tdsfc - 2 * fT(500);
}

/** Convective Instability Index of Reap */
export function computeCII(fT: ValueAccessor, fTd: ValueAccessor, Pbegin: number) {
  const thetae700 = equivalentPotentialTemperature(fT(700), fTd(700), 700);
  const thetaesfc = equivalentPotentialTemperature(fT(Pbegin), fTd(Pbegin), Pbegin);
  const thetae850 = equivalentPotentialTemperature(fT(850), fTd(850), 850);
  return thetae700 - ((thetaesfc + thetae850)/2);
}

/** Computes Fog Stability Index */
export function computeFSI(fT: ValueAccessor, fTd: ValueAccessor, fSpd: ValueAccessor, Pbegin: number) {
  return 4*fT(Pbegin) - 2*(fT(850) + fTd(Pbegin)) + fSpd(850);
}

/** Computes Deep Convective Index */
export function computeDCI(fT: ValueAccessor, fTd: ValueAccessor, Pbegin: number) {
  const LI = computeLiftedIndex(fT, fTd, Pbegin);
  return fT(850) + fTd(850) - LI;
}

/** Computes Ko Index */
export function computeKo(fT: ValueAccessor, fTd: ValueAccessor) {
  const thetae1000 = equivalentPotentialTemperature(fT(1000), fTd(1000), 1000);
  const thetae850 = equivalentPotentialTemperature(fT(850), fTd(850), 850);
  const thetae700 = equivalentPotentialTemperature(fT(700), fTd(700), 700);
  const thetae500 = equivalentPotentialTemperature(fT(500), fTd(500), 500);
  return 0.5 * (thetae500 + thetae700) - 0.5 * (thetae850 + thetae1000);
}

/** Computes Potential Instability Index */
export function computePII(fT: ValueAccessor, fTd: ValueAccessor, fZ: ValueAccessor) {
  const thetae925 = equivalentPotentialTemperature(fT(925), fTd(925), 925);
  const thetae500 = equivalentPotentialTemperature(fT(500), fTd(500), 500);
  const z500 = fZ(500);
  const z950 = fZ(950);
  return (thetae925 - thetae500) / (z500 - z950) * 1000;
}

/** Computes Humidity Index */
export function computeHumidityIndex(fT: ValueAccessor, fTd: ValueAccessor) {
  return (fT(850)-fTd(850)) + (fT(700)-fTd(700)) + (fT(500)-fTd(500));
}