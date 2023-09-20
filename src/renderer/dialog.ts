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

export class Dialog {
  private static windows: Dialog[] = [];

  private zIndex: number;

  private element: HTMLDivElement;
  private titleElement: HTMLDivElement;
  private closeBtn: HTMLDivElement;

  private isBeingMoved: boolean;
  private pos1: number;
  private pos2: number;
  private pos3: number;
  private pos4: number;

  constructor(id: string) {
    this.element = <HTMLDivElement>document.getElementById(id)!;
    this.titleElement = <HTMLDivElement>document.getElementById(id + '-title')!;
    this.closeBtn = <HTMLDivElement>document.getElementById(id + '-close');

    this.zIndex = Dialog.windows.length;
    this.element.style.zIndex = this.zIndex.toString();
    this.element.addEventListener('mousedown', () => {Dialog.raise(this)});

    this.isBeingMoved = false;
    this.pos1 = 0;
    this.pos2 = 0;
    this.pos3 = 0;
    this.pos4 = 0;

    window.addEventListener('resize', () => {this.resize()});
    document.addEventListener('mouseup', () => {this.mouseUp()});
    document.addEventListener('mousemove', (e: MouseEvent) => {this.mouseMove(e)});
    this.titleElement.addEventListener('mousedown', (e: MouseEvent) => {this.mouseDown(e)});
    this.closeBtn.addEventListener('click', () => {this.close()});

    Dialog.windows.push(this);
  }
  
  private mouseUp() {
    this.isBeingMoved = false;
  }

  private mouseMove(e: MouseEvent) {
    if (this.isBeingMoved) {
      let outOfBounds = false;
      if (e.pageX < 0) {
        this.element.style.left = '0px';
        outOfBounds = true;
      } else if (e.pageX >= window.innerWidth - 1) {
        const newLeft = window.innerWidth - this.element.offsetWidth - 1;
        this.element.style.left = (newLeft >= 0 ? newLeft : 0).toString() + "px";
        outOfBounds = true;
      }
      
      if (e.pageY < 0) {
        this.element.style.top = '0px';
        outOfBounds = true;
      } else if (e.pageY >= window.innerHeight - 1) {
        const newTop = window.innerHeight - this.element.offsetHeight - 1;
        this.element.style.top = (newTop >= 0 ? newTop : 0).toString() + "px";
        outOfBounds = true;
      }

      if (outOfBounds) {
        return;
      }

      e.preventDefault();

      this.pos1 = this.pos3 - e.clientX;
      this.pos2 = this.pos4 - e.clientY;
      this.pos3 = e.clientX;
      this.pos4 = e.clientY;

      const newY = (this.element.offsetTop - this.pos2);
      const newX = (this.element.offsetLeft - this.pos1);

      if (newY >= 0 && newY + this.element.offsetHeight < window.innerHeight - 1) {
        this.element.style.top = newY + "px";
      }
      
      if (newX >= 0 && newX + this.element.offsetWidth < window.innerWidth - 1) {
        this.element.style.left = newX + "px";
      }
    }
  }

  private mouseDown(e: MouseEvent) {
    e.preventDefault();
  
    this.pos3 = e.clientX;
    this.pos4 = e.clientY;

    this.isBeingMoved = true;
  }

  private resize() {
    const top = parseInt(window.getComputedStyle(this.element).top);
    const left = parseInt(window.getComputedStyle(this.element).left);

    if (top + this.element.offsetHeight >= window.innerHeight - 1) {
      const newTop = window.innerHeight - this.element.offsetHeight - 1;
      this.element.style.top = (newTop >= 0 ? newTop : 0).toString() + "px";
    }

    if (left + this.element.offsetWidth >= window.innerWidth - 1) {
      const newLeft = window.innerWidth - this.element.offsetWidth - 1
      this.element.style.left = (newLeft >= 0 ? newLeft : 0).toString() + "px";
    }
  }

  private close() {
    this.element.hidden = true;
  }

  private static raise(dialog: Dialog) {
    const selfZ = dialog.zIndex;

    for (const win of Dialog.windows) {
      if (win.zIndex > selfZ) {
        win.zIndex--;
        win.element.style.zIndex = win.zIndex.toString();
      }
    }

    dialog.zIndex = Dialog.windows.length;
    dialog.element.style.zIndex = dialog.zIndex.toString();
  }
}