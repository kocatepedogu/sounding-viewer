# Sounding Viewer

A simple sounding visualization tool that can edit sounding data.

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

[wgrib2](https://www.cpc.ncep.noaa.gov/products/wesley/wgrib2/) is required for parsing GRIB2 files from NOMADS server. Binaries are included in the release packages for [Windows](https://ftp.cpc.ncep.noaa.gov/wd51we/wgrib2/Windows10/v3.0.2/) and [Linux](https://sourceforge.net/projects/opengrads/files/wgrib2/0.1.9.4/). It can be compiled from [source](https://www.ftp.cpc.ncep.noaa.gov/wd51we/wgrib2/) if you use another OS. 

## Installing

For Windows 10/11 (amd64) and Linux (amd64), binaries can be found under releases. No installation is needed. Extract the zip file and run sounding-viewer.

## Building from source ##

Node.js (14.x or above) is needed. Clone the git repository and open a terminal/command prompt in the root directory.

To build and start the application:
```console
npm install
npm run build
npm run start
```

To create a binary package
```console
npm run package
```

## Terms of Use

There are no restrictions on how you use the software as long as you redistribute it under GNU GPL version 3 (or later). However, please read the terms of use of rucsoundings.noaa.gov and nomads.ncep.noaa.gov. The software does not make any attempts to prevent you from doing anything that violates their terms of use. If you do excessive requests, you may get blocked from using the server. **Always wait (at least) 10 seconds before loading a new sounding.** You can save soundings as text files and later import them if you need to be able switch between different soundings frequently.

From rucsoundings.noaa.gov
> "We reserve the right to deny access to any individual or organization that we determine is abusing this service. Examples of abuse include automated transfers resulting in excessive data requests (because it hinders others from accessing the service) and attempting to gain access to documents and host machines not intended for public use."

From NOMADS Grib Filter Help
>Using parameters and looping, data acquisition may be customized and automated. If your script contains loops, then be sure to include a 10 second wait between fetches to protect against runaway loops and ensure responsible sharing of the server resources. Without waits between fetches, the server may mistake excessive requests as denial-of-service attack and block the user. 

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
