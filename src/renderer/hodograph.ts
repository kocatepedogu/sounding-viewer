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

import * as sounding from './sounding';

export class Hodograph {
  private snd: sounding.Sounding;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private plotWidth: number;
  private plotHeight: number;
  private plotRadius: number;
  private originX: number;
  private originY: number;

  private maxWindSpeed: number = 0;
  private rR: number = NaN;

  constructor(snd: sounding.Sounding) {
    this.snd = snd;
    this.snd.addObserver(() => {this.update()});

    this.canvas = document.getElementById('hodograph-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.plotWidth = this.width * 0.9;
    this.plotHeight = this.height * 0.9;
    this.plotRadius = Math.min(this.plotWidth, this.plotHeight) / 2;
    this.originX = (this.width - this.plotWidth) / 2 + this.plotRadius - 1;
    this.originY = (this.height - this.plotHeight) / 2 + this.plotRadius - 1;
  }

  private findLimits() {
    for (const level of this.snd) {
      if (level.windspd > this.maxWindSpeed) {
        this.maxWindSpeed = level.windspd;
      }
    }

    this.rR = this.plotRadius / this.maxWindSpeed;
  }

  computeCoordinates(windspd: number, winddir: number): [number, number] {
    const x = this.originX + windspd * this.rR * Math.cos(Math.PI * (90 + winddir) / 180);
    const y = this.originY + windspd * this.rR * Math.sin(Math.PI * (90 + winddir) / 180);

    return [x, y];
  }

  plotBackground() {
    // Clear canvas
    this.ctx.beginPath();
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Plot axes
    this.ctx.beginPath();
    this.ctx.moveTo(this.originX, this.originY - this.plotRadius);
    this.ctx.lineTo(this.originX, this.originY + this.plotRadius);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(this.originX - this.plotRadius, this.originY);
    this.ctx.lineTo(this.originX + this.plotRadius, this.originY);
    this.ctx.stroke();

    // Print degree labels on the axes
    for (let dir = 0; dir < 360; dir += 90) {
      this.ctx.fillStyle = "black";
      this.ctx.fillText(dir.toString(), ...this.computeCoordinates(this.maxWindSpeed, dir));
    }
    
    // Plot circles
    for (let wspd = 0; wspd <= this.maxWindSpeed; wspd += this.maxWindSpeed / 5) {
      const r = wspd * this.rR;

      this.ctx.arc(this.originX, this.originY, r, 0, 2 * Math.PI);
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 0.7;
      this.ctx.stroke();

      this.ctx.fillStyle = "red";
      this.ctx.fillText(wspd.toFixed(1), this.originX, this.originY + r);
    }
  }

  plotWinds() {
    let [ox, oy] = this.computeCoordinates(this.snd.first().windspd, this.snd.first().winddir);
    for (const level of this.snd) {
      const [x, y] = this.computeCoordinates(level.windspd, level.winddir);

      this.ctx.beginPath();
      this.ctx.moveTo(ox, oy);
      this.ctx.lineTo(x, y);
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = "blue";
      this.ctx.stroke();

      ox = x;
      oy = y;
    }
  }

  plot() {
    this.findLimits();
    this.plotBackground();
    this.plotWinds();
  }

  update() {
    this.plot();
  }
}