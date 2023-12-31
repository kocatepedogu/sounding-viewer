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

/* eslint-disable @typescript-eslint/no-var-requires */

import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Tile from 'ol/layer/Tile.js';
import Attribution from 'ol/control/Attribution.js';
import {defaults} from 'ol/control/defaults.js';
import OSM from 'ol/source/OSM.js';
import {fromLonLat, transform} from 'ol/proj.js';
import MapBrowserEvent from 'ol/MapBrowserEvent.js';

export class LocationMap {
  private map: Map;
  private clickHandler?: (evt: MapBrowserEvent<UIEvent>) => unknown;

  constructor() {
    const attribution = new Attribution({
      collapsible: false
    });

    this.map = new Map({
      controls: defaults({attribution: false}).extend([attribution]),
      layers: [
          new Tile({
              source: new OSM({
                  maxZoom: 18
              })
          })
      ],
      target: 'map-div',
      view: new View({
          center: fromLonLat([29, 41]),
          maxZoom: 18,
          zoom: 4
      })
    });

    this.map.on('singleclick', (evt: MapBrowserEvent<UIEvent>) => {
      this.clickHandler!(evt);
    });
  }

  setClickHandler(handler: (evt: MapBrowserEvent<UIEvent>) => unknown) {
    this.clickHandler = handler;
  }
}

export class Options {
  private optionList: HTMLUListElement;
  private sourceSelector: HTMLSelectElement;
  private map: LocationMap;
  private lastLat: number = NaN;
  private lastLon: number = NaN;

  constructor(map: LocationMap) {
    this.map = map;
    this.optionList = <HTMLUListElement>document.getElementById('options');
    this.sourceSelector = <HTMLSelectElement>document.getElementById('srcselector');
    this.sourceSelector.addEventListener('input', () => { this.updateSource(this.sourceSelector.value);});
    this.sourceSelector.dispatchEvent(new InputEvent('input'));
  }

  private updateSource(src: string) {
    for (let i = this.optionList.children.length - 1; i >= 1; --i) {
      this.optionList.removeChild(this.optionList.children[i]);
    }

    if (src == 'rucsoundings') {
      this.newSelect("type", "Type", 
        (type) => {this.updateTypeRucsoundings(type)}, 
        this.newOption('gfs', 'GFS 0.5', true));
    }

    if (src == 'nomads') {
      this.newSelect("type", "Type",
        (type) => {this.updateTypeNOMADS(type)},
        this.newOption('gfs', 'GFS 0.25', true));
    }

    if (src == 'import') {
      this.newFileInput("file", "File: ", (input) => {
        const file = input.files![0];
        const reader = new FileReader();

        reader.onload = (evt) => {
          localStorage.setItem('import', <string>evt.target!.result);
        };
        reader.onerror = () => {
          alert('Cannot read given file');
        }
        
        reader.readAsText(file, 'UTF-8');
      });
    }
  }

  private updateTypeRucsoundings(type: string) {
    this.removeDownto(2);

    if (type == 'gfs') {
      const hours = [...Array(65).keys()].map(i => (i*3).toString());
      this.newSelect('hour', 'Hour', () => {}, ...hours.map(h => this.newOption(h, h)));

      const lat = this.newTextbox('lat', 'Latitude');
      const lon = this.newTextbox('lon', 'Longtitude');
      if (!Number.isNaN(this.lastLat)) lat.value = this.lastLat.toString();
      if (!Number.isNaN(this.lastLon)) lon.value = this.lastLon.toString();

      this.map.setClickHandler((evt: MapBrowserEvent<UIEvent>) => {
        const [x, y] = transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');

        lat.value = y.toString();
        lon.value = x.toString();
        this.lastLat = y;
        this.lastLon = x;
      });
    }
  }

  private async updateTypeNOMADS(type: string) {
    this.removeDownto(2);

    const updateHour = async () => {
      this.removeDownto(5);

      const lat = this.newTextbox('lat', 'Latitude');
      const lon = this.newTextbox('lon', 'Longtitude');
      if (!Number.isNaN(this.lastLat)) lat.value = this.lastLat.toString();
      if (!Number.isNaN(this.lastLon)) lon.value = this.lastLon.toString();

      this.map.setClickHandler((evt: MapBrowserEvent<UIEvent>) => {
        const [x, y] = transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');

        lat.value = y.toString();
        lon.value = x.toString();
        this.lastLat = y;
        this.lastLon = x;
      }); 
    }

    const updateRun = async (host:string, mainDirectory: string, date:string, run: string) => {
      this.removeDownto(4);

      this.disableInputs();
      const files = await window.IO.getFileListFromFTP(host, `${mainDirectory}/gfs.${date}/${run}/atmos`);
      this.enableInputs();

      if (files instanceof Error) {
        alert('Cannot connect server');
        return;
      }

      const gfsFiles = files.filter((e: string) => {
        const params = e.split('.');
        return params.length == 5 && params[0] == 'gfs' && params[1].substring(1,3) == run && 
                params[2] == 'pgrb2' && params[3] == '0p25' && params[4] != 'anl';});

      const gfsHours = gfsFiles.map((e: string) => {
        const params = e.split('.');
        return params[4].substring(1);
      });

      this.newSelect('hour', 'Hour',
        () => updateHour(), 
        ...gfsHours.map((hour: string) => this.newOption(hour, hour))
      );
    }

    const updateDate = async(host:string, mainDirectory: string, date: string) => {
      this.removeDownto(3);

      this.disableInputs();
      const directories = await window.IO.getFileListFromFTP(host, mainDirectory + '/gfs.' + date);
      this.enableInputs();

      if (directories instanceof Error) {
        alert('Cannot connect server');
        return;
      }

      this.newSelect('runTime', 'Run Hour', 
      (run) => updateRun(host, mainDirectory, date, run), 
      ...directories.map((run: string) => this.newOption(run, run)).reverse());
    }

    if (type == 'gfs') {
      const host = "ftp.ncep.noaa.gov";
      const mainDirectory = "/pub/data/nccf/com/gfs/prod";

      this.disableInputs();
      const directories = await window.IO.getFileListFromFTP(host, mainDirectory);
      this.enableInputs();

      if (directories instanceof Error) {
        alert('Cannot connect server');
        return;
      }

      const gfsDirectories = directories.filter((e: string) => e.split('.')[0] == 'gfs');
      const gfsDates = gfsDirectories.map((e: string) => e.split('.')[1]).reverse();

      this.newSelect('runDate', 'Run Date', 
        (date) => updateDate(host, mainDirectory, date), 
        ...gfsDates.map((date:string) => 
          this.newOption(date, `${date.substring(0,4)}/${date.substring(4,6)}/${date.substring(6,8)}`)));
    }
  }

  private removeDownto(n: number) {
    for (let i = this.optionList.children.length - 1; i >= n; --i) {
      this.optionList.removeChild(this.optionList.children[i]);
    }
  }

  private newOption(name: string, text: string, selected: boolean = false) {
    const option = document.createElement('option');
    option.textContent = text;
    option.value = name;
    option.selected = selected;
    return option;
  }

  private newSelect(name: string, label: string, handler: (value: string) => void, ...options: HTMLOptionElement[]) {
    const select = document.createElement('select');
    select.name = name;
    select.id = name;
    select.addEventListener('input', () => {
      handler(select.value);
    });

    for (const opt of options) {
      select.add(opt);
    }

    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.appendChild(select);

    const li = document.createElement('li');
    li.appendChild(lbl)

    this.optionList.appendChild(li);
    select.dispatchEvent(new InputEvent('input'));

    return select;
  }

  private newTextbox(name: string, label: string, value: string = '') {
    const textbox = document.createElement('input');
    textbox.type = 'text';
    textbox.value = value;
    textbox.name = name;
    textbox.id = name;

    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.appendChild(textbox);

    const li = document.createElement('li');
    li.appendChild(lbl);

    this.optionList.appendChild(li);
    textbox.dispatchEvent(new InputEvent('input'));

    return textbox;
  }

  private newFileInput(name: string, label: string, handler: (input: HTMLInputElement) => void) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.name = name;
    fileInput.id = name;
    fileInput.addEventListener('input', () => {
      handler(fileInput);
    });

    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.appendChild(fileInput);

    const li =document.createElement('li');
    li.appendChild(lbl);

    this.optionList.appendChild(li);
    return fileInput;
  }

  private disableInputs() {
    document.body.style.cursor = 'progress';
    document.querySelectorAll('input, select, button').forEach(
      (element) => {(<HTMLInputElement|HTMLSelectElement|HTMLButtonElement>element).disabled = true;}
    );
  }

  private enableInputs() {
    document.body.style.cursor = '';
    document.querySelectorAll('input, select, button').forEach(
      (element) => {(<HTMLInputElement|HTMLSelectElement|HTMLButtonElement>element).disabled = false;}
    );
  }
}

if (typeof window !== 'undefined') {
  window.initializeMapAndOptions = function () {
    const map = new LocationMap();
    new Options(map);
  }
}