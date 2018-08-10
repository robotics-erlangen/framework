
///// Provides robot generations specific classes
//module "Robot.Generation"
////

//***********************************************************************
//*   Copyright 2015 Alexander Danzer, Michael Eischer                      *
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

let Robot = require "../base/robot"
let Generation = {
	Gen2014_3 = require "../base/robots/generation2014"
}

let constantsMt = { __index = Robot.constants }
for (_, cls in pairs(Generation)) {
	setmetatable(cls.constants, constantsMt)
}

/// Creates a new generation specific robot object.
// For these robot objects the constants table of robot is overlayed with generations specific constants.
// This functions is a factory for constructing robots.
// @name create
// @param specs table - Specs as returned by getTeam()
// @return Robot - Specific generation if available or generic robot object
function Generation.factory (specs) {
	let robotGen = Generation["Gen"  +  String(specs.year)  +  "_"  +  String(specs.generation)]
	if (robotGen) {
		return robotGen(specs, true)
	}
	return Robot(specs.id, true)
}

return Generation
