
///// Allows running an analysis module before / after each strategy run
//module "Processor"
////

//***********************************************************************
//*   Copyright 2015 Michael Eischer, Christian Lobmeier                    *
//*   Robotics Erlangen e.V.                                                *
//*   http://www.robotics-erlangen.de/                                      *
//*   info@robotics-erlangen.de                                             *
//*                                                                         *
//*   This program is free software: you can redistribute it and/or modify  *
//*   it under the terms of the GNU General Public License as published by  *
//*   the Free Software Foundation, either version 3 of the License, or     *
//*   any later version.                                                    *
//*                                                                         *
//*   This program is distributed in the hope that it will be useful,       *
//*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
//*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
//*   GNU General Public License for more details.                          *
//*                                                                         *
//*   You should have received a copy of the GNU General Public License     *
//*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
//*************************************************************************

let Processor = {}

let Class = require "../base/class"
let Process = require "../base/process"


let preprocs = {}
let postprocs = {}

let add = function (procs, proc) {
	assert(proc  &&  Class.instanceOf(proc, Process), "no valid process!")
	table.insert(procs, proc)
}

/// Adds a process for runnning before the strategy
// @name addPre
// @param proc Process - Process object to be run
function Processor.addPre (proc) {
	add(preprocs, proc)
}

/// Adds a process for runnning after the strategy
// @name addPost
// @param proc Process - Process object to be run
function Processor.addPost (proc) {
	add(postprocs, proc)
}

let run = function (procs) {
	for (i = #procs,1,-1) {
		let proc = procs[i]
		proc:run()
		if (proc:isFinished()) {
			table.remove(procs, i)
		}
	}
}

/// Runs all proccess object scheduled before the strategy.
// Should be called by the entrypoint wrapper
// @name pre
function Processor.pre () {
	run(preprocs)
}

/// Runs all proccess object scheduled after the strategy.
// Should be called by the entrypoint wrapper
// @name post
function Processor.post () {
	run(postprocs)
}

return Processor
