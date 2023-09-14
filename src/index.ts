// SPDX-License-Identifier: GPL-3.0-or-later

import Map from '../node_modules/ol/Map.js';
import View from '../node_modules/ol/View.js';
import Tile from '../node_modules/ol/layer/Tile.js';
import Attribution from '../node_modules/ol/control/Attribution.js';
import {defaults} from '../node_modules/ol/control/defaults.js';
import OSM from '../node_modules/ol/source/OSM.js';
import {fromLonLat, transform} from '../node_modules/ol/proj.js';
import MapBrowserEvent from '../node_modules/ol/MapBrowserEvent.js';

/*import { createRequire } from 'module';
const require = createRequire(import.meta.url);*/

class LocationMap {
  private map: Map;
  private clickHandler?: (evt: MapBrowserEvent<any>) => unknown;

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

    this.map.on('singleclick', (evt: MapBrowserEvent<any>) => {
      this.clickHandler!(evt);
    });
  }

  setClickHandler(handler: (evt: MapBrowserEvent<any>) => unknown) {
    this.clickHandler = handler;
  }
}

class Options {
  private optionList: HTMLUListElement;
  private srcSelectorLI: HTMLLIElement;
  private sourceSelector: HTMLSelectElement;
  private map: any;

  constructor(map: any) {
    this.map = map;
    this.optionList = <HTMLUListElement>document.getElementById('options');
    this.srcSelectorLI = <HTMLLIElement>this.optionList.firstChild;
    this.sourceSelector = <HTMLSelectElement>document.getElementById('srcselector');
    this.sourceSelector.addEventListener('input', () => { this.updateSource(this.sourceSelector.value);});
    this.sourceSelector.dispatchEvent(new InputEvent('input'));
  }

  updateSource(src: string) {
    for (let i = this.optionList.children.length - 1; i >= 1; --i) {
      this.optionList.removeChild(this.optionList.children[i]);
    }

    if (src == 'rucsoundings') {
      this.newSelect("type", "Type", 
        (type) => {this.updateTypeRucsoundings(type)}, 
        this.newOption('gfs', 'GFS 0.5', true),
        this.newOption('raob', 'RAOB'));
    }
  }

  updateTypeRucsoundings(type: string) {
    for (let i = this.optionList.children.length - 1; i >= 2; --i) {
      this.optionList.removeChild(this.optionList.children[i]);
    }

    if (type == 'gfs') {
      const lat = this.newTextbox('lat', 'Latitude');
      const lon = this.newTextbox('lon', 'Longtitude');
      const hours = [...Array(65).keys()].map(i => (i*3).toString());
      this.newSelect('hour', 'Hour', () => {}, ...hours.map(h => this.newOption(h, h)));

      this.map.setClickHandler((evt: MapBrowserEvent<any>) => {
        const [x, y] = transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');

        lat.value = y.toString();
        lon.value = x.toString();
      });
    }

    if (type == 'raob') {
      this.newTextbox('wmoid', 'WMOID');
    }
  }

  private newOption(name: string, text: string, selected: boolean = false) {
    const option = <HTMLOptionElement>document.createElement('option');
    option.textContent = text;
    option.value = name;
    option.selected = selected;
    return option;
  }

  private newSelect(name: string, label: string, handler: (value: string) => void, ...options: HTMLOptionElement[]) {
    const select = <HTMLSelectElement>document.createElement('select');
    select.name = name;
    select.id = name;
    select.addEventListener('input', () => {
      handler(select.value);
    });

    for (const opt of options) {
      select.add(opt);
    }

    const lbl = <HTMLLabelElement>document.createElement('label');
    lbl.textContent = label;
    lbl.appendChild(select);

    const li = <HTMLLIElement>document.createElement('li');
    li.appendChild(lbl)

    this.optionList.appendChild(li);
    select.dispatchEvent(new InputEvent('input'));

    return select;
  }

  private newTextbox(name: string, label: string, value: string = '') {
    const textbox = <HTMLInputElement>document.createElement('input');
    textbox.type = 'text';
    textbox.value = value;
    textbox.name = name;
    textbox.id = name;

    const lbl = <HTMLLabelElement>document.createElement('label');
    lbl.textContent = label;
    lbl.appendChild(textbox);

    const li = <HTMLLIElement>document.createElement('li');
    li.appendChild(lbl);

    this.optionList.appendChild(li);
    textbox.dispatchEvent(new InputEvent('input'));

    return textbox;
  }
}

const map:LocationMap = new LocationMap();
const opt:Options = new Options(map);

map;opt;
