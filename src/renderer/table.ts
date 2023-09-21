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

import * as data from "./sounding"

export class SoundingTable {
  private sounding: data.Sounding;
  private observers: Array<(lev: number) => void> = [];
  private previousActiveLevel: number;

  /* Level properties that will be displayed together with their titles */
  private readonly levelProperties = ["pressure", "height", "temp", "dewpt", "windspd", "winddir"];
  private readonly levelPropertyDigits = [0, 0, 2, 2, 1, 0];
  private readonly levelPropertyTitles = ["P", "Z", "T", "Td", "km/h", "Dir", "Vec"];

  /* Currently edited cell */
  private lastEdited: HTMLDivElement | undefined = undefined;

  /* Closes currently edited cell */
  private closeInputBox() {
    if (this.lastEdited) {
      const levelprop = this.lastEdited.id.split('-');
      const levelID = parseInt(levelprop[0]);
      const prop = levelprop[1];
      const propIndex = this.levelProperties.indexOf(prop);

      this.lastEdited.innerText = this.sounding.find(levelID)[prop].toFixed(this.levelPropertyDigits[propIndex]);
      this.lastEdited = undefined;
    }
  }

  /* Table context menu */
  private contextMenu: HTMLDivElement = document.getElementById('sounding-table-menu')! as HTMLDivElement;
  private choosenLevel: number = -1;

  /* Closes context menu */
  private closeContextMenu() {
    const choosenLevelValue = this.choosenLevel;
    if (choosenLevelValue != -1) {
      /* Remove highlight from the selected row */
      const choosenRow: HTMLElement = document.getElementById(choosenLevelValue.toString()) as HTMLElement;
      if (choosenRow != undefined) { // Check if the row has been deleted.
        choosenRow.removeAttribute('style');
      }

      this.choosenLevel = -1;

      /* Make context menu hidden */
      this.contextMenu.style.visibility = "hidden";
    }
  }

  /* Generates HTML code for single a row */
  private generateRowCode(level: data.Level) {
    let newRow = 
      `<div class="sounding-table-data-rows" id="${level.id}">
         <div class="sounding-table-check-cells"><input type="checkbox" id="check-${level.id}" ${level.enabled ? "checked" : ""}/></div>`;

    for (let i = 0; i < this.levelProperties.length; i++) {
      const prop = this.levelProperties[i];
      const digits = this.levelPropertyDigits[i];
      newRow += `<div class="sounding-table-data-cells" id="${level.id + '-' + prop}">${level[prop].toFixed(digits)}</div>`; 
    }

    newRow += `<div class="sounding-table-wind-cells" id="${level.id + '-arrow'}">
                  <object data="../../resources/arrow.svg" width="16px" height="16px" style="transform: rotate(${(-90 + level.winddir) % 360}deg);">
                  </object>
               </div>`;

    return newRow + `</div>`;
  }

  private tableLeftClickHandler(event: MouseEvent, sounding: data.Sounding) {
    this.closeContextMenu();

    const targetElement = event.target as HTMLElement;
    
    if (targetElement instanceof HTMLDivElement && targetElement.className == "sounding-table-data-cells") {
      const target = targetElement.id.split('-');
      const targetLevel = parseInt(target[0])
      const targetParameter = target[1];

      // If there is a currently edited cell, close it.
      this.closeInputBox();

      // Create a text box in the cell.
      const currentContent = targetElement.innerText;
      targetElement.innerHTML = `<input id="sounding-table-edit" type="text" value="${sounding.find(targetLevel)[targetParameter]}" size="${currentContent.length}">`;
      this.lastEdited = targetElement;
      
      const inputbox: HTMLInputElement = this.lastEdited.firstElementChild! as HTMLInputElement;

      // Change sounding data as soon as user changes text box contents.
      inputbox.addEventListener('input', () => {
        const newValue = parseFloat(inputbox.value);
        sounding.changeAttribute(targetLevel, targetParameter, newValue);
      });

      // Close the text box when user presses the enter key.
      inputbox.addEventListener('keydown', (event) => {
        if (event.key == "Enter") this.closeInputBox();
      });
    }

    if (targetElement instanceof HTMLInputElement) {
      const inputElement: HTMLInputElement = targetElement;
      if (inputElement.type == "checkbox") {
        const target = targetElement.id.split('-');
        const targetLevel = parseInt(target[1]);

        if (inputElement.checked) {
          sounding.enableLevel(targetLevel);
        } else {
          sounding.disableLevel(targetLevel);
        }
      }
    }
  }

  private tableRightClickHandler(event: MouseEvent) {
    this.closeContextMenu();

    /* Find the row that generated the right click event */
    const targetElement = event.target as HTMLElement;

    /* Ignore right clicks on the title */
    if (targetElement.className == "sounding-table-title-column") return;

    const targetPosition = targetElement.id.split('-');
    const newChoosenLevel = targetPosition[0];

    if (targetElement instanceof HTMLDivElement) {
      /* Make context menu visible */
      this.contextMenu.style.top = `${event.y}px`;
      this.contextMenu.style.left = `${event.x}px`;
      this.contextMenu.style.visibility = 'visible';

      /* Highlight the selected row */
      const choosenRow: HTMLElement = document.getElementById(newChoosenLevel) as HTMLElement;
      choosenRow.style.backgroundColor = "gray";
      this.choosenLevel = parseInt(newChoosenLevel);

      event.preventDefault();
      event.stopPropagation();
    }
  }

  private contextMenuClickHandler(event: MouseEvent, sounding: data.Sounding) {
    const option: HTMLElement = event.target as HTMLElement;
    switch (option.id) {
      case 'sounding-table-menu-delete': {
        sounding.delete(this.choosenLevel);
        document.getElementById(this.choosenLevel.toString())!.remove();
        break;
      }
      case 'sounding-table-menu-insert-above': {
        const newLevel = sounding.insertAbove(this.choosenLevel);
        const currentRow = document.getElementById(this.choosenLevel.toString());
        currentRow?.insertAdjacentHTML('beforebegin', this.generateRowCode(newLevel));
        break;
      }
      case 'sounding-table-menu-insert-below': {
        const newLevel = sounding.insertBelow(this.choosenLevel);
        const currentRow = document.getElementById(this.choosenLevel.toString());
        currentRow?.insertAdjacentHTML('afterend', this.generateRowCode(newLevel));
        break;
      }
    }

    this.closeContextMenu();
    event.preventDefault();
  }

  private mouseMoveHandler(event: MouseEvent, sounding: data.Sounding) {
    const targetElement = event.target as HTMLElement;
    if (targetElement.className == 'sounding-table-data-cells') {  
      const id = parseInt(targetElement.id.split('-')[0]);
      const level = sounding.find(id);
      if (this.previousActiveLevel != level.pressure) {
        this.observers.forEach(fn => fn(level.pressure));
        this.previousActiveLevel = level.pressure;
      }
    }
  }

  /* Fills table with given data and sets event handlers */
  constructor(sounding: data.Sounding) {
    this.sounding = sounding;
    this.previousActiveLevel = sounding.first().pressure;

    /* Get sounding table element */
    const soundingTable = document.getElementById('sounding-table');
    if (!soundingTable) {
      throw new Error("Sounding table does not exist.")
    }

    /* Display header of the table */
    let tableHead = '<div id="sounding-table-title"><div class="sounding-table-title-column"></div>';
    this.levelPropertyTitles.forEach((title) => {tableHead += `<div class="sounding-table-title-column">${title}</div>`});
    tableHead += "</div>";

    /* Display levels */
    let tableBody = '<div id="sounding-table-body">';
    for (const level of sounding.levels) {
      tableBody += this.generateRowCode(level);
    }

    soundingTable.innerHTML = tableHead + tableBody + '</div>';

    /* Event handlers of context menu */
    this.contextMenu.addEventListener('click', (event) => {this.contextMenuClickHandler(event, sounding);});
    this.contextMenu.addEventListener('contextmenu', (event) => {this.contextMenuClickHandler(event, sounding);});

    /* Event handlers of table */
    soundingTable.addEventListener('click', (event) => {this.tableLeftClickHandler(event, sounding);});
    soundingTable.addEventListener('contextmenu', (event) => {this.tableRightClickHandler(event);});
    soundingTable.addEventListener('mousemove', (event) => {this.mouseMoveHandler(event, sounding);});
  }

  /** Adds a callback function that gets called when the active level is changed */
  addObserver(fncallback: (lev: number) => void) {
    this.observers.push(fncallback);
  }
}