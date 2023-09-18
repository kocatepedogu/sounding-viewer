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

export interface LevelSource {
   /** Pressure in milibars (mb) */
   pressure: number;
   /** Height in meters (m) */
   height: number;
   /** Temperature in Celsius */
   temp: number;
   /** Dewpoint temperature in Celsius */
   dewpt: number;
   /** Wind direction in degrees */
   winddir: number;
   /** Wind speed (unit is given in Header.wsunits) */
   windspd: number;
}

export class Level {
  static lastID: number = 0;

  /** ID of the level */
  readonly id: number;
  /** Pressure in milibars (mb) */
  pressure: number = NaN;
  /** Height in meters (m) */
  height: number = NaN;
  /** Temperature in Celsius */
  temp: number = NaN;
  /** Dewpoint temperature in Celsius */
  dewpt: number = NaN;
  /** Wind direction in degrees */
  winddir: number = NaN;
  /** Wind speed (km/s) */
  windspd: number = NaN;
  /** Use this level in computations */
  enabled: number = NaN;

  [key: string]: number;

  constructor() {
    this.id = Level.lastID++;
    this.enabled = 1;
  }
}

export class Sounding implements Iterable<Level> {
  levels: Array<Level>;

  private enabledLevels: Array<Level> = [];
  private observers: Array<() => void> = [];

  constructor(src: Iterable<LevelSource>) {
    this.levels = [];
    for (const level of src) {
      const newLevel = new Level();
      Object.assign(newLevel, level);
      newLevel.enabled = newLevel.pressure > 300 ? 1 : 0;
      this.levels.push(newLevel);
    }

    this.updateEnabledLevels();
  }

  /** Iterates over active levels */
  *[Symbol.iterator]():Iterator<Level> {
    for (const level of this.levels) {
      if (level.enabled) {
        yield level;
      }
    }
  }

  /** Returns first enabled level */
  first() {
    return this.enabledLevels[this.enabledLevels.length - 1];
  }

  /** Returns last enabled level */
  last() {
    return this.enabledLevels[0];
  }
  
  /** Executes given function for each active level */
  forEach(callbackfn: (value: Level) => void): void {
    for (const level of this.levels) {
      if (level.enabled) {
        callbackfn(level);
      }
    }
  }
  
  /** Enables the level with the given ID */
  enableLevel(id: number) {
    this.find(id).enabled = 1;
    this.onChange();
  }

  /** Disables the level with the given ID */
  disableLevel(id: number) {
    this.find(id).enabled = 0;
    this.onChange();
  }

  /** Returns the index of the level with given ID */
  findIndex(id: number): number {
    const index = this.levels.findIndex(e => e.id == id);
    if (index == -1) {
      throw new Error("Element not found");
    }

    return index;
  }

  /** Returns the level with the given ID */
  find(id: number): Level {
    const level = this.levels.find(e => e.id == id);
    if (level == undefined) {
      throw new Error("Element not found");
    }

    return level;
  }

  /**
   * Changes an attribute of the level with the given ID
   */
  changeAttribute(id: number, attr: string, value: number) {
    this.find(id)[attr] = value;
    this.onChange();
  }

  /** 
   * Returns the value of levels[prop] where levels[i].pressure == pressure.
   * getValueAt(980, temp) returns temperature at 980 mb.
   */
  getValueAt(pressure: number, prop: string): number {
    for (let i = 0; i < this.enabledLevels.length - 1; i++) {
      const currentLevel = this.enabledLevels[i];
      const nextLevel = this.enabledLevels[i+1];

      if (currentLevel.pressure <= pressure && pressure <= nextLevel.pressure) {
        const currentProp = currentLevel[prop];
        const nextProp = nextLevel[prop];

        const interval = currentLevel.pressure - nextLevel.pressure;
        const r1 = (pressure - nextLevel.pressure) / interval;
        const r2 = (currentLevel.pressure - pressure) / interval;
        return r1 * currentProp + r2 * nextProp;
      }
    }

    throw new Error("Pressure cannot be reached using interpolation. Internal error.");
  }

  /**
   * Inserts a new level below the level with the given ID.
   */
  insertBelow(id: number) {
    const index = this.findIndex(id);
    if (index == this.levels.length - 1) {
      /* If a new level is inserted after the last level, use linear extrapolation. */
      const prevLevel = this.levels[index - 1];
      const currentLevel = this.levels[index];
      const newLevel = Sounding.extrapolate(currentLevel, prevLevel);
      this.levels.push(newLevel);
      this.onChange();
      return newLevel;
    } else {
      /* If a new level is inserted between two levels, use linear interpolation. */
      const currentLevel = this.levels[index];
      const nextLevel = this.levels[index + 1];
      const newLevel = Sounding.interpolate(currentLevel, nextLevel);
      this.levels.splice(index + 1, 0, newLevel);
      this.onChange();
      return newLevel;
    }
  }

  /**
   * Insert a new level above the level with the given ID.
   */
  insertAbove(id: number) {
    const index = this.findIndex(id);
    if (index == 0) {
      /* If a new level is inserted before the first level, use linear extrapolation. */
      const currentLevel = this.levels[index];
      const nextLevel = this.levels[index + 1];
      const newLevel = Sounding.extrapolate(currentLevel, nextLevel);
      this.levels.unshift(newLevel);
      this.onChange();
      return newLevel;
    } else {
      /* If a new level is inserted between two levels, use linear interpolation. */
      const prevLevel = this.levels[index - 1];
      const currentLevel = this.levels[index];
      const newLevel = Sounding.interpolate(prevLevel, currentLevel);
      this.levels.splice(index, 0, newLevel);
      this.onChange();
      return newLevel;
    }
  }

  /**
   * Deletes the level with the given ID.
   * @param id 
   */
  delete(id: number) {
    const index = this.findIndex(id);
    this.levels.splice(index, 1);
    this.onChange();
  }

  /**
   * Adds an observer callback function that will be called when the sounding data is changed.
   */
  addObserver(callbackfn: () => void) {
    this.observers.push(callbackfn);
  }

  private onChange() {
    this.updateEnabledLevels();
    this.observers.forEach(fn => {fn();});
  }

  private updateEnabledLevels() {
    this.enabledLevels = this.levels.filter(lev => {return lev.enabled});
    this.enabledLevels.sort(
      (a,b) => {
        if (a.pressure < b.pressure) { return -1; } 
        else if (a.pressure == b.pressure) { return 0; }
        else { return 1; }
    });
  }

  private static interpolate(lev1: Level, lev2: Level): Level {
    const newLevel = new Level();

    newLevel.pressure = (lev1.pressure + lev2.pressure) / 2;
    newLevel.height = (lev1.height + lev2.height) / 2;
    newLevel.temp = (lev1.temp + lev2.temp) / 2;
    newLevel.dewpt = (lev1.dewpt + lev2.dewpt) / 2;
    newLevel.winddir = (lev1.winddir + lev2.winddir) / 2;
    newLevel.windspd = (lev1.windspd + lev2.windspd) / 2;

    return newLevel;
  }

  private static extrapolate(lev1: Level, lev2: Level): Level {
    const newLevel = new Level();

    newLevel.pressure = 2 * lev1.pressure - lev2.pressure;
    newLevel.height = 2 * lev1.height - lev2.height;
    newLevel.temp = 2 * lev1.temp - lev2.temp;
    newLevel.dewpt = 2 * lev1.dewpt - lev2.dewpt;
    newLevel.winddir = 2 * lev1.winddir - lev2.winddir;
    newLevel.windspd = 2 * lev1.windspd - lev2.windspd;

    return newLevel;
  }
}
