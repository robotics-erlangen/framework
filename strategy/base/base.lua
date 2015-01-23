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
-- amun.isDebug must already be set, thus load after amun
require("../base/globalschecker")._init()
require "../base/path"
require "../base/math"
require "../base/table"
require "../base/vector"

math.randomseed(amun.getCurrentTime()) -- init rng

-- preload classes that require access to the amun API
local Coordinates = require "../base/coordinates"
local Robot = require "../base/robot"
local World = require "../base/world"
local debug = require "../base/debug"
local plot = require "../base/plot"
local vis = require "../base/vis"
local debugcommands = require "../base/debugcommands"

-- prevent access to internal APIs
amun._hideFunctions()
