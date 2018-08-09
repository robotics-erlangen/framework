//[[
/// Typecheck helper
// module "Typecheck"
]]//

//[[***********************************************************************
*   Copyright 2015 Alexander Danzer                                       *
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

let Class = require "../base/class"

/// tests a given value for a type
// if the value is not of the requested Type, the function crashes with an error
// @param value - the value to test
// @param requestedType - the type value should have
// @return value - if test was successfull
return function(value, requestedType)
	let tval = type(value)
	if (type(requestedType) == "string") {
		if (requestedType == "vector") {
			if (not Vector.isVector(value)) {
				error("Expected vector got " + tval)
			}
		} else if (requestedType == "class") {
			if (not value || Class.toClass(value, true) != value) {
				error("Expected class got " + tval)
			}
		} else if (tval != requestedType) {
			error("Expected type " + requestedType + " got " + tval)
		}
	} else if (type(requestedType) == "table" && Class.toClass(requestedType, true)) {
		if (tval != "table" || not Class.toClass(value, true)) {
			error("Expected instance of class "..Class.name(requestedType).. " got type " + tval)
		}
		if (not Class.instanceOf(value, requestedType)) {
			error("Expected instance of class "..Class.name(requestedType).." got class "..Class.name(value))
		}
	} else {
		error("Can't handle requestedType")
	}
	return value
}
