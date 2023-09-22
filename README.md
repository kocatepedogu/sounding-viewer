# Sounding Viewer

An easy-to-use sounding visualization tool that allows editing values.

<img src="./resources/app.png" width="800px">

## Features
+ Provides a simple interface to choose coordinates, model run and hour for obtaining GFS data from rucsoundings.noaa.gov and nomads.ncep.noaa.gov.
+ Imports and exports files in GSL format
+ Sounding data can be modified through the table panel, and changes are immediately reflected in the diagram and in the indices panel.
+ It is possible to insert new levels, and delete existing levels.
+ Pressure levels can be temporarily excluded from index calculations and plots.
+ Detailed moisture information for all levels, including interpolated levels.
+ Skewness and temperature limits of the Skew-T log-P diagram are automatically determined, but they are customizable.
+ Wet bulb temperature and virtual temperature lines
+ Hodograph
+ Instability indices

## Indices

+ CAPE, CIN, LFC, EL and Lifted Index (both surface based and most unstable parcel based)
+ Precipitable Water
+ K Index, Modified K Index
+ Totals Totals, Modified Totals Totals
+ Soaring Index
+ Boyden Index
+ Vertical Totals, Cross Totals
+ Modified Jefferson Index
+ Rackliff Index
+ Thompson Index
+ Showalter Index
+ Convective Instability Index
+ Fog Stability Index
+ Deep Convective Index
+ KO Index
+ Potential Instability Index
+ Humidity Index
+ Bottom and top altitudes of the deepest effective inflow layer
+ Bulk shear for 0-1km, 0-3km, 0-6km, 0-8km and effective inflow layer
+ Bunkers Storm Motion speed for right moving and left moving supercells
+ Storm Relative Helicity for 0-1km, 0-3km and effective inflow layer
+ Energy Helicity Index for 0-1km, 0-3km and effective inflow layer
+ SWEAT Index
+ Supercell Composite Parameter

## Dependencies

No external dependencies are required for soundings obtained from rucsoundings.noaa.gov, but the data is relatively limited. In order to parse GRIB2 files obtained from nomads.ncep.noaa.gov, [wgrib2](https://www.cpc.ncep.noaa.gov/products/wesley/wgrib2/) is required.

**On Windows**

The wgrib2 binaries together with necessary Cygwin DLLs are provided at the wgrib2 website: [https://ftp.cpc.ncep.noaa.gov/wd51we/wgrib2/Windows10/v3.0.2/](https://ftp.cpc.ncep.noaa.gov/wd51we/wgrib2/Windows10/v3.0.2/) Download all files at the link into the same directory, and add that directory to the environment variable PATH before installing Sounding Viewer.

**On Linux**

Most common distributions have wgrib2 package in their repositories. If you use a distribution that does not provide wgrib2 binaries, it can be easily compiled from [source](https://www.ftp.cpc.ncep.noaa.gov/wd51we/wgrib2/) by simply running 'make'. No configuration is needed. The binary is produced in the subdirectory wgrib2. Adding that directory to PATH is sufficient.

## Installing

For Windows and Debian-based Linux distributions, binary installers can be found under releases.

## Building from source ##

Node is needed.

To build and start the application:
```console
npm install
npm run build
npm run start
```

To create a binary installer:
```console
npm install
npm run build
npm run make
```

## LICENSE

Sounding Viewer is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Sounding Viewer is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License
for more details.

You should have received a copy of the GNU General Public License along
with Sounding Viewer. If not, see <https://www.gnu.org/licenses/>.