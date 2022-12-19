/**
 * @module plot
 * Send plot data to Ra
 */

/**************************************************************************
*   Copyright 2018 Michael Eischer, Andreas Wendler                       *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

let amunLocal = amun;


/**
 * Add data to a plot. Value is used to create a point at the current time
 * @param name - Plot name, seperated layers by '.'
 * @param value - value for data point
 */
export function addPlot(name: string, value: number) {
	amunLocal.addPlot(name, value);
}


let aggregated: { [name: string]: number } = {};
let lastAggregated: { [name: string]: number } = {};
export function _plotAggregated() {
	for (let k in aggregated) {
		addPlot(k, aggregated[k]);
	}
	for (let k in lastAggregated) {
		if (aggregated[k] == undefined) {
			// line down to zero
			addPlot(k, 0);
		}
	}
	lastAggregated = aggregated;
	aggregated = {};
}

export function aggregate(key: string, value: number) {
	if (aggregated[key] == undefined) {
		aggregated[key] = 0;
	}
	aggregated[key] = aggregated[key] + value;
}

