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

import * as sounding from "./sounding"

export class SoundingTable {
  private sounding: sounding.Sounding;
  private table: HTMLElement;
  private observers: Array<(lev: number) => void> = [];
  private previousActiveLevel: number;

  private static readonly properties = [
    {name: 'pressure', precision: 0, title: 'P'},
    {name: 'height', precision: 0, title: 'Z'},
    {name: 'temp', precision: 2, title: 'T'},
    {name: 'dewpt', precision: 2, title: 'Td'},
    {name: 'windspd', precision: 1, title: 'km/h'},
    {name: 'winddir', precision: 0, title: 'Dir'}
  ];

  /* Currently edited cell */
  private lastEdited: HTMLDivElement|undefined;

  /* Table context menu */
  private contextMenu!: HTMLDivElement;
  private choosenLevel!: number;

  constructor(sounding: sounding.Sounding) {
    this.sounding = sounding;
    this.previousActiveLevel = sounding.first().pressure;

    const table = document.getElementById('sounding-table');
    if (!table) {
      throw new Error("Sounding table does not exist.")
    }

    this.table = table;

    this.constructContextMenu();
    this.constructTitle();
    this.constructBody();
    this.constructEvents();
  }

  /** Adds a callback function that gets called when the active level is changed */
  addObserver(fncallback: (lev: number) => void) {
    this.observers.push(fncallback);
  }

  private constructContextMenu() {
    this.contextMenu = document.getElementById('sounding-table-menu')! as HTMLDivElement;
    this.choosenLevel = NaN;
  }

  private constructTitle() {
    const tableTitle = document.createElement('div');
    tableTitle.id = 'sounding-table-title';

    const checkColumn = document.createElement('div');
    checkColumn.className = 'sounding-table-title-column';
    tableTitle.appendChild(checkColumn);

    for (const property of SoundingTable.properties) {
      const labelColumn = document.createElement('div');
      labelColumn.className = 'sounding-table-title-column';
      labelColumn.textContent = property.title;
      tableTitle.appendChild(labelColumn);
    }

    this.table.appendChild(tableTitle);
  }

  private constructBody() {
    const tableBody = document.createElement('div');
    tableBody.id = 'sounding-table-body';
    for (const level of this.sounding.levels) {
      tableBody.appendChild(this.generateRow(level));
    }

    this.table.appendChild(tableBody);
  }

  private constructEvents() {
    this.contextMenu.addEventListener('click', 
      (event) => {this.contextMenuClickHandler(event);});
    this.contextMenu.addEventListener('contextmenu',
      (event) => {this.contextMenuClickHandler(event);});

    this.table.addEventListener('click',
      (event) => {this.tableLeftClickHandler(event);});
    this.table.addEventListener('contextmenu',
      (event) => {this.tableRightClickHandler(event);});
    this.table.addEventListener('mousemove',
      (event) => {this.mouseMoveHandler(event);});
  }

  private closeInputBox() {
    if (this.lastEdited) {
      const levelprop = this.lastEdited.id.split('-');
      const levelID = parseInt(levelprop[0]);
      const propName = levelprop[1];
      const prop = SoundingTable.properties.find(property => property.name == propName);

      this.lastEdited.innerText = this.sounding.find(levelID)[propName].toFixed(prop?.precision);
      this.lastEdited = undefined;
    }
  }

  private closeContextMenu() {
    const choosenLevelValue = this.choosenLevel;
    if (!Number.isNaN(choosenLevelValue)) {
      const choosenRow: HTMLElement = document.getElementById(choosenLevelValue.toString()) as HTMLElement;
      if (choosenRow != undefined) {
        choosenRow.removeAttribute('style');
      }

      this.choosenLevel = NaN;
      this.contextMenu.style.visibility = "hidden";
    }
  }

  private generateRow(level: sounding.Level) {
    const dataRow = document.createElement('div');
    dataRow.className = 'sounding-table-data-rows';
    dataRow.id = level.id.toString();

    const checkBoxCell = document.createElement('div');
    checkBoxCell.className = 'sounding-table-check-cells';
    dataRow.appendChild(checkBoxCell);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'check-' + level.id.toString();
    checkbox.checked = level.enabled ? true : false;
    checkBoxCell.appendChild(checkbox);

    for (const property of SoundingTable.properties) {
      const dataCell = document.createElement('div');
      dataCell.className = 'sounding-table-data-cells';
      dataCell.id = level.id.toString() + '-' + property.name;
      dataCell.textContent = level[property.name].toFixed(property.precision);
      dataRow.appendChild(dataCell);
    }

    const windCell = document.createElement('div');
    windCell.className = 'sounding-table-wind-cells';
    windCell.id = level.id.toString() + '-arrow';
    dataRow.appendChild(windCell);

    const windArrow = document.createElement('object');
    windArrow.data = '../../resources/arrow.svg';
    windArrow.width = '16px';
    windArrow.height = '16px';
    windArrow.style.transform = `rotate(${(-90 + level.winddir) % 360}deg)`
    windCell.appendChild(windArrow);

    return dataRow;
  }

  private tableLeftClickHandler(event: MouseEvent) {
    this.closeContextMenu();

    const targetElement = event.target as HTMLElement;
    if (targetElement instanceof HTMLDivElement && targetElement.className == "sounding-table-data-cells") {
      this.dataCellLeftClickHandler(targetElement);
    }
    else if (targetElement instanceof HTMLInputElement) {
      if (targetElement.type == "checkbox") {
        this.checkboxLeftClickHandler(targetElement);
      }
    }
  }

  private dataCellLeftClickHandler(targetElement: HTMLDivElement) {
    const target = targetElement.id.split('-');
    const targetLevel = parseInt(target[0])
    const targetParameter = target[1];

    // If there is a currently edited cell, close it.
    this.closeInputBox();

    // Create a text box in the cell.
    const textbox = document.createElement('input');
    textbox.id = 'sounding-table-edit';
    textbox.type = 'text';
    textbox.value = this.sounding.find(targetLevel)[targetParameter].toString();
    textbox.size = (targetElement.textContent || '').length;
    targetElement.replaceChildren(textbox);
    this.lastEdited = targetElement;
    
    const inputbox: HTMLInputElement = this.lastEdited.firstElementChild! as HTMLInputElement;

    // Change sounding data as soon as user changes text box contents.
    inputbox.addEventListener('input', () => {
      const newValue = parseFloat(inputbox.value);
      this.sounding.changeAttribute(targetLevel, targetParameter, newValue);
    });

    // Close the text box when user presses the enter key.
    inputbox.addEventListener('keydown', (event) => {
      if (event.key == "Enter") this.closeInputBox();
    });
  }

  private checkboxLeftClickHandler(targetElement: HTMLInputElement) {
    const target = targetElement.id.split('-');
    const targetLevel = parseInt(target[1]);

    if (targetElement.checked) {
      this.sounding.enableLevel(targetLevel);
    } else {
      this.sounding.disableLevel(targetLevel);
    }
  }

  private tableRightClickHandler(event: MouseEvent) {
    this.closeContextMenu();

    // Find the row that generated the right click event
    const targetElement = event.target as HTMLElement;

    // Ignore right clicks on the title
    if (targetElement.className == "sounding-table-title-column") return;

    const targetPosition = targetElement.id.split('-');
    const newChoosenLevel = targetPosition[0];

    if (targetElement instanceof HTMLDivElement) {
      // Make context menu visible
      this.contextMenu.style.top = `${event.y}px`;
      this.contextMenu.style.left = `${event.x}px`;
      this.contextMenu.style.visibility = 'visible';

      // Highlight the selected row
      const choosenRow: HTMLElement = document.getElementById(newChoosenLevel) as HTMLElement;
      choosenRow.style.backgroundColor = "gray";
      this.choosenLevel = parseInt(newChoosenLevel);

      event.preventDefault();
      event.stopPropagation();
    }
  }

  private contextMenuClickHandler(event: MouseEvent) {
    const option: HTMLElement = event.target as HTMLElement;
    switch (option.id) {
      case 'sounding-table-menu-delete': {
        this.sounding.delete(this.choosenLevel);
        document.getElementById(this.choosenLevel.toString())!.remove();
        break;
      }
      case 'sounding-table-menu-insert-above': {
        const newLevel = this.sounding.insertAbove(this.choosenLevel);
        const currentRow = document.getElementById(this.choosenLevel.toString());
        currentRow?.insertAdjacentElement('beforebegin', this.generateRow(newLevel));
        break;
      }
      case 'sounding-table-menu-insert-below': {
        const newLevel = this.sounding.insertBelow(this.choosenLevel);
        const currentRow = document.getElementById(this.choosenLevel.toString());
        currentRow?.insertAdjacentElement('afterend', this.generateRow(newLevel));
        break;
      }
    }

    this.closeContextMenu();
    event.preventDefault();
  }

  private mouseMoveHandler(event: MouseEvent) {
    const targetElement = event.target as HTMLElement;
    if (targetElement.className == 'sounding-table-data-cells') {  
      const id = parseInt(targetElement.id.split('-')[0]);
      const level = this.sounding.find(id);
      if (this.previousActiveLevel != level.pressure) {
        this.observers.forEach(fn => fn(level.pressure));
        this.previousActiveLevel = level.pressure;
      }
    }
  }
}