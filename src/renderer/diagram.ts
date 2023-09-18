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

import * as data from "./data"
import * as numerical from "./numerical"

interface PlotFeature {
  /** Color of the line */
  color: string,
  /** ID used in the function list panel */
  id: string,
  /** Name shown in the function list panel */
  name: string,
  /** Function gets plotted if true */
  enabled: boolean
}

interface PlotFunction extends PlotFeature {
  /** func takes a height value and returns a Celsius value. */
  func: (height: number) => number;
  /** Specifies line width used in stroke drawing */
  lineWidth: number,
}

interface PlotCurve extends PlotFeature {
  /* func draws curves on the diagram */
  func: () => void;
}

export class SoundingPlot {
  private sounding: data.Sounding;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private skew: number = 45;
  private skewInput!: HTMLInputElement;
  private tmin: number = NaN;
  private tminInput!: HTMLInputElement;
  private tmax: number = NaN;
  private tmaxInput!: HTMLInputElement;
  private automaticLimits: boolean = true;
  private automaticLimitsCheck!: HTMLInputElement;
  private tstep: number = 10;
  private tstepInput!: HTMLInputElement;
  private pmin: number = NaN;
  private pmax: number = NaN;

  private plotWidth: number = NaN;
  private plotHeight: number = NaN;
  private plotX: number = NaN;
  private plotY: number = NaN;
  private lastX: number = NaN;
  private lastY: number = NaN;
  private rP: number = NaN;
  private rT: number = NaN;

  private functions: PlotFunction[] = [
    {func: (p: number) => {
      return this.sounding.getValueAt(p, "temp");
    }, color: 'red', lineWidth: 1.25, id:"temp", name: "Temperature", enabled: true},

    {func: (p: number) => {
      return this.sounding.getValueAt(p, "dewpt");
    }, color: 'blue', lineWidth: 1.25, id: "dewpt", name: "Dewpoint Temperature", enabled: true},

    {func: (p: number) => {
      return numerical.wetBulbTemperature(this.sounding.getValueAt(p, "temp"), this.sounding.getValueAt(p, "dewpt"), p);
    }, color: 'green', lineWidth: 1.25, id: "wetbulb", name: "Wet Bulb Temperature", enabled: false},

    {func: (p: number) => {
      return numerical.virtualTemperature(this.sounding.getValueAt(p, "temp"), this.sounding.getValueAt(p, "dewpt"), p);
    }, color: 'orange', lineWidth: 1.25, id: "virttemp", name: "Virtual Temperature", enabled: false}
  ];

  private curves: PlotCurve[] = [
    {func: () => {this.drawPressureLines();}, 
      color: 'lightgray', id: 'pressure', name: 'Pressure levels', enabled: true},

    {func: () => {this.drawTemperatureLines();},
      color: "darkgray", id:"temperaturelines", name: "Temperature lines", enabled: true},

    {func: () => {this.drawAdiabat(numerical.liftSaturatedParcel, "green");}, 
      color: "green", id:"moistadiabats", name: "Moist adiabats", enabled: false},

    {func: () => {this.drawAdiabat(numerical.liftDryParcel, "brown");}, 
      color: "brown", id:"dryadiabats", name: "Dry adiabats", enabled: false},

    {func: () => {this.drawParcelTemperature();},
      color: "gray", id:"parceltemperature", name: "Parcel temperature", enabled: true}
  ];

  constructor(sounding: data.Sounding) {
    this.sounding = sounding;
    this.canvas = document.getElementById('sounding-diagram') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.sounding.addObserver(() => {
      this.update();
    });

    this.initializeDiagramSettings();
    this.initializeFeatureList('sounding-function-list-ul', this.functions);
    this.initializeFeatureList('sounding-curve-list-ul', this.curves);
  }

  /**
   * Initializes events and default attributes of setting inputs below the canvas.
   */
  private initializeDiagramSettings() {
    this.skewInput = document.getElementById('skew-input') as HTMLInputElement;
    this.skewInput.value = this.skew.toString();
    this.skewInput.step = '1';
    this.skewInput.addEventListener('input', () => {
      this.skew = parseFloat(this.skewInput.value);
      this.update();
    });

    this.tminInput = document.getElementById('tmin-input') as HTMLInputElement;
    this.tminInput.disabled = true;
    this.tminInput.addEventListener('input', () => {
      this.tmin = parseInt(this.tminInput.value);
      this.update();
    });

    this.tmaxInput = document.getElementById('tmax-input') as HTMLInputElement;
    this.tmaxInput.disabled = true;
    this.tmaxInput.addEventListener('input', () => {
      this.tmax = parseInt(this.tmaxInput.value);
      this.update();
    });

    this.automaticLimitsCheck = document.getElementById('check-automatic-limits') as HTMLInputElement;
    this.automaticLimitsCheck.checked = true;
    this.automaticLimitsCheck.addEventListener('input', () => {
      this.automaticLimits = this.automaticLimitsCheck.checked;
      if (this.automaticLimits) {
        this.tminInput.disabled = this.tmaxInput.disabled = true;
      } else {
        this.tminInput.disabled = this.tmaxInput.disabled = false;
      }

      this.update();
    });

    this.tstepInput = document.getElementById('tstep-input') as HTMLInputElement;
    this.tstepInput.value = this.tstep.toString();
    this.tstepInput.addEventListener('input', () => {
      this.tstep = parseInt(this.tstepInput.value);
      this.update();
    });
  }

  /**
   * Creates checkbox lists for plot features on the right panel.
   */
  private initializeFeatureList(listElement: string, featureList: PlotFeature[]) {
    const checkboxList = document.getElementById(listElement) as HTMLInputElement;
    for (const feature of featureList) {
      const inputElement = document.createElement('input');
      inputElement.type = 'checkbox';
      inputElement.id = 'check-func-' + feature.id;
      inputElement.style.accentColor = feature.color;
      inputElement.checked = feature.enabled;
      inputElement.addEventListener('click', () => {
        feature.enabled = inputElement.checked;
        this.update();
      });
      
      const liElement = document.createElement('li');
      liElement.appendChild(inputElement);
      liElement.appendChild(document.createTextNode(feature.name));

      checkboxList.appendChild(liElement);
    }
  }

  /** 
   * Computes coordinates of plot boundaries 
   */
  private findPlotBoundaries() {
    this.plotWidth = this.width * 0.8;
    this.plotHeight = this.height * 0.9;
    this.plotX = this.width * 0.1;
    this.plotY = this.height * 0.05;
    this.lastX = this.plotX + this.plotWidth - 1;
    this.lastY = this.plotY + this.plotHeight - 1;
  }

  /** 
   * Computes pressure and temperature limits of the plot region. 
   */
  private findLimits() {
    this.pmax = Number.MIN_VALUE;
    this.pmin = Number.MAX_VALUE;
    this.sounding.forEach(l => {
      if (l.pressure && Number(l.pressure)) {
        if (l.pressure > this.pmax) this.pmax = l.pressure;
        if (l.pressure < this.pmin) this.pmin = l.pressure;
      }
    });

    if (this.automaticLimits) {
      let maxT: number = Number.MIN_VALUE;
      let minT: number = Number.MAX_VALUE;

      this.sounding.forEach(l => {
        if (l.temp && Number(l.temp)) {
          if (l.temp > maxT) { maxT = l.temp; }
          if (l.temp < minT) { minT = l.temp; }
        }
      });

      minT += 5;
      maxT += 5;

      this.tmin = Math.floor(minT);
      this.tmax = Math.ceil(maxT);
      this.tminInput.value = this.tmin.toString();
      this.tmaxInput.value = this.tmax.toString();
    }

    this.rP = this.plotHeight / (Math.log(this.pmax/this.pmin));
    this.rT = this.plotWidth / (this.tmax - this.tmin);
  }

  /** 
   * Compute the (x, y) coordinates of a given (pressure, temperature) pair. 
   */
  private computeCoordinates(p: number, t: number) {
    if (isNaN(t)) {
      t = this.tmin;
    }

    const rawY = Math.log(p/this.pmin) * this.rP;
    let y = this.plotY + rawY;
    if (y < this.plotY) {
      y = this.plotY;
    } else if (y > this.lastY) {
      y = this.lastY;
    }

    let x = this.plotX + (t - this.tmin) * this.rT + (this.plotHeight - rawY) * Math.sin(Math.PI * this.skew/180);
    if (x < this.plotX) {
      x = this.plotX;
    } else if (x > this.lastX) {
      x = this.lastX;
    }

    return [x, y];
  }

  /**
   * Draws horizontal pressure lines
   */
  private drawPressureLines() {
    for (const level of this.sounding) {
      const pressure = level.pressure!;
      const y = this.computeCoordinates(pressure, 0)[1];

      if (y != this.plotY) {
        this.ctx.beginPath();
        this.ctx.lineWidth = 0.18;
        this.ctx.strokeStyle = "gray";
        this.ctx.moveTo(this.plotX, y);
        this.ctx.lineTo(this.plotX + this.plotWidth, y);
        this.ctx.stroke();

        this.ctx.font = "8px";
        this.ctx.fillStyle = "black";
        this.ctx.fillText(level.pressure!.toString(), this.plotX - 30, y);
      }
    }
  }

  /**
   * Draws temperature lines
   */
  private drawTemperatureLines() {
    for (let T = this.tmin - Math.abs(this.tmin); T <= this.tmax + Math.abs(this.tmax); T += this.tstep) {
      let [ox, oy] = this.computeCoordinates(this.sounding.first().pressure, T);
      
      if (ox != this.plotX && ox != this.lastX) {
        this.ctx.font = "8px";
        this.ctx.fillStyle = "black";
        this.ctx.fillText(T.toFixed(0), ox, oy + 10);
      }

      for (let P = this.sounding.first().pressure; P >= this.sounding.last().pressure; P -= 1) {
        const [x, y] = this.computeCoordinates(P, T);

        this.ctx.beginPath();
        this.ctx.strokeStyle = "gray";
        this.ctx.lineWidth = 1;
        this.ctx.moveTo(ox, oy);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();

        ox = x, oy = y;
      }
    }
  }

  /**
   * Draws an adiabat curve
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  private drawAdiabat(fn: Function, color: string) {
    for (let Tinitial = this.tmin - Math.abs(this.tmin); Tinitial <= this.tmax + Math.abs(this.tmax); Tinitial += this.tstep) {
      let [ox, oy] = this.computeCoordinates(this.sounding.first().pressure, Tinitial);
      for (const [P, T] of fn(Tinitial, this.sounding.first().pressure, this.sounding.last().pressure)) {
        const [x, y] = this.computeCoordinates(P, T);

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 0.35;
        this.ctx.moveTo(ox, oy);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();

        ox = x, oy = y;
      }
    }
  }

  /**
   * Finds the LCL and draws a small label at its pressure.
   */
  private findLCL() {
    const LCL = numerical.liftedCondensationLevel(
      this.sounding.first().pressure, 
      this.sounding.first().temp, 
      this.sounding.first().dewpt);

    const LCLy = this.computeCoordinates(LCL, 0)[1];

    this.ctx.fillStyle = "black";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("LCL", this.lastX + 12, LCLy);

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX - 10, LCLy);
    this.ctx.lineTo(this.lastX + 10, LCLy);
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    return LCL;
  }

  /**
   * Draws given function curves (temperature, dew point)
   */
  private plotFunctions() {
    for (const func of this.functions) {
      if (func.enabled) {
        let [ox, oy] = this.computeCoordinates(this.sounding.first().pressure, func.func(this.sounding.first().pressure));

        for (let pressure = this.sounding.first().pressure; pressure >= this.sounding.last().pressure; pressure -= 1) {
          const temp = func.func(pressure);
          const [x, y] = this.computeCoordinates(pressure, temp);

          this.ctx.beginPath();
          this.ctx.strokeStyle=func.color;
          this.ctx.lineWidth = func.lineWidth;
          this.ctx.moveTo(ox, oy);
          this.ctx.lineTo(x, y);
          this.ctx.stroke();

          ox = x, oy = y;
        }
      }
    }
  }

  /**
   * Draws parcel temperature curve
   */
  private drawParcelTemperature() {
    const itr = numerical.liftParcel(
      this.sounding.first().temp, this.sounding.first().pressure, 
      this.sounding.last().pressure, this.findLCL());

    const [oP, oT] = itr.next().value as number[];
    let [ox, oy] = this.computeCoordinates(oP, oT);

    for (const [P, T] of itr) {
      const [x, y] = this.computeCoordinates(P, T);
      
      this.ctx.beginPath();
      this.ctx.strokeStyle = "darkgray";
      this.ctx.lineWidth = 2;
      this.ctx.moveTo(ox, oy);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();

      ox = x, oy = y;
    }
  }

  /**
   * Draws the plot.
   */
  private plot() {
    // There must be at least two distinct levels for drawing a Skew-T diagram.
    if (!this.sounding.first() || !this.sounding.last()) {
      return;
    }
    if (this.sounding.first() == this.sounding.last()) {
      return;
    }

    /* Find limits and boundaries */
    this.findPlotBoundaries();
    this.findLimits();

    /* Clear canvas */
    this.ctx.beginPath();
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, this.width, this.height);

    /* Draw curves */
    for (const curve of this.curves) {
      if (curve.enabled) {
        curve.func();
      }
    }

    // Find LCL and draw small a horizontal line with a LCL label.
    this.findLCL();

    // Draw functions
    this.plotFunctions();

    // Draw borders around the plot region.
    this.ctx.beginPath();
    this.ctx.strokeStyle="black";
    this.ctx.lineWidth = 1;
    this.ctx.rect(this.plotX, this.plotY, this.plotWidth, this.plotHeight);
    this.ctx.stroke();
  }

  update() {
    let errorMessage = "";

    try {
      this.plot();
    } catch (e) {
      errorMessage = (e as Error).toString();
    }

    (document.getElementById('sounding-error') as HTMLLabelElement).innerText = errorMessage;
  }
}
