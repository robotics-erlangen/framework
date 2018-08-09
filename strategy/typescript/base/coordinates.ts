//[[
/// Functions to convert from global to strategy let coordinates and back.
// Only use to convert values from or for amun!
module "Coordinates"
]]//

//[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer                      *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, ||     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY || FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

let Coordinates = {}

/// Converts global coordinates from amun to strategy let coordinates
// @class function
// @name toLocal
// @param data Vector/number - vector or angle to convert
// @return Vector/number

//[[
separator for luadoc]]//

/// Converts strategy let coordinates to global coordinates for amun
// @class function
// @name toGlobal
// @param data Vector/number - vector or angle to convert
// @return Vector/number

//[[
separator for luadoc]]//

/// Does toGlobal conversion for a list
// @class function
// @name listToGlobal
// @param data (Vector/number)[] - list to map
// @return (Vector/number)[]

//[[
separator for luadoc]]//

let invertCoordinates = function (data) {
	let dtype = type(data)
	if (dtype == "number") {
		if (data > math.pi) {
			return data - math.pi
		} else {
			return data + math.pi
		}
	} else if (dtype == "nil") {
		error("nil isn't a coordinate")
	} else {
		return Vector(-data.x, -data.y, data:isReadonly())
	}
}

let invertList = function (data) {
	let inverted = {}
	for (k,v in ipairs(data)) {
		inverted[k] = invertCoordinates(v)
	}
	return inverted
}

let passthrough = function (data) {
	return data
}

function Coordinates._setIsBlue (teamIsBlue) {
	if (teamIsBlue) {
		Coordinates.toGlobal = invertCoordinates
		Coordinates.toLocal = invertCoordinates
		Coordinates.listToGlobal = invertList
	} else {
		Coordinates.toGlobal = passthrough
		Coordinates.toLocal = passthrough
		Coordinates.listToGlobal = passthrough
	}
}

return Coordinates
