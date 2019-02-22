/**
 * @module processor
 * Allows running an analysis module before/after each strategy run
 */

/**************************************************************************
*   Copyright 2018 Michael Eischer, Christian Lobmeier, Andreas Wendler   *
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

import { Process } from "base/process";


let preprocs: Process[] = [];
let postprocs: Process[] = [];

/**
 * Adds a process for runnning before the strategy
 * @param proc - Process object to be run
 */
export function addPre(proc: Process) {
	preprocs.push(proc);
}

/**
 * Adds a process for runnning after the strategy
 * @param proc - Process object to be run
 */
export function addPost(proc: Process) {
	postprocs.push(proc);
}

function run(procs: Process[]) {
	for (let proc of procs) {
		proc.run();
		if (proc.isFinished()) {
			procs.splice(procs.indexOf(proc), 1);
		}
	}
}

/**
 * Runs all proccess object scheduled before the strategy.
 * Should be called by the entrypoint wrapper
 */
export function pre() {
	run(preprocs);
}

/**
 * Runs all proccess object scheduled after the strategy.
 * Should be called by the entrypoint wrapper
 */
export function post() {
	run(postprocs);
}

