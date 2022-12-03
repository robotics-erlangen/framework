--[[
--- Loads global modules. Also takes care of initializing the random number generator. <br/>
-- General informations: <br/>
-- The coordinate systems y-direction points towards the opponent goal. <br/>
-- The x-direction points from the left to the right border. <br/>
-- It is centered on the kickoff point. <br/>
-- Angles are oriented counter-clockwise, 0 points in positive x-direction. <br/>
-- Angles are measured in radians. <br/>
-- All lengths are unless specified otherwise denoted in meters.
-- Speed in m/s and acceleration in m/s^2.
module "base"
]]--

--[[***********************************************************************
*   Copyright 2015 Michael Eischer                                        *
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
*************************************************************************]]

require "../base/amun"
local debugger = require "../base/debugger" -- preload debugger to allow triggering it later
if math.mod ~= nil then
	log("Warning: Using LuaJIT without lua 5.2 compatibility mode. Strategy behaviour on replay may be unstable")
end
require "../base/path"
require "../base/eigen"
-- amun.isDebug must already be set, thus load after amun
require("../base/globalschecker")._init(amun.isDebug)
require("../base/class")._setDebug(amun.isDebug)
require "../base/math"
require "../base/table"
require "../base/vector"
Vector._loadGeom()

-- preload classes that require access to the amun API
require("../base/coordinates")._setIsBlue(amun.isBlue())
require "../base/debug"
require "../base/debugcommands"
require "../base/plot"
require "../base/robot"
require "../base/vis"
require "../base/world"
require "../base/option"
debugger._loadBaseDebug()

-- prevent access to internal APIs
amun._hideFunctions()
