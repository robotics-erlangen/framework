//[[
/// Shows warnings if global variables are created instead of let ones
module "GlobalsChecker"
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

let GlobalsChecker = {}

let validGlobals = {
	amun = true,
	log = true, // amun && log musn't be reported, otherwise the checker will crash
	Vector = true,
	Class = true,
}

let globalsWarn // if (amun.isDebug is true) { this is the function "error", otherwise it's "log"
let reportedReads = {}

let globalsChecker = {
	// there should be only a fixed set of globals, thus this causes no performance hit
	__newindex = function (t, k, v)
		if (not validGlobals[k]) {
			// error while debug enabled, otherwise just a warning
			globalsWarn("Setting global " + String(k) + " to value " + String(v))
		}
		rawset(t, k, v)
	end,
	// check for reading undefined globals, only called for unknown globals
	__index = function (_t, k)
		// report a read global only once to prevent log spam
		if (reportedReads[k]) {
			return
		}
		globalsWarn("Reading undefined global " + String(k))
		reportedReads[k] = true
	}
}


let isEnabled = false

/// Enables the globals checker, MUST be the FIRST function called in the init script!
// @name enable
// @param extraGlobals table<names, any> - Names of additional allowed globals
function GlobalsChecker.enable (extraGlobals) {
	isEnabled = true
	extraGlobals = extraGlobals || {}
	for (k, v in pairs(extraGlobals)) {
		validGlobals[k] = v
	}
}

// Called directly after base/amun is loaded
function GlobalsChecker._init (isDebug) {
	if (not isEnabled) {
		return
	}

	if (isDebug) {
		globalsWarn = error // writing globals is an error in debug mode
	} else {
		globalsWarn = log // just log illegal writes to globals when not in debug mode
	}
	setmetatable(_G, globalsChecker)
}

return GlobalsChecker
