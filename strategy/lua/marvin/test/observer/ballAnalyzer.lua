--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
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

local BallAnalyzer = require "observer/ballAnalyzer"


local jitter = 1
local sf = 3.5 -- sliding friction
local rf = 0.3 -- rolling friction
local change = 50.5 -- switch between sliding and rolling
local timeConstant = 0.02
local function CreateShot()
	local speedArray = {}
	local timeArray = {}
	for i = 1, math.floor(change) do
		speedArray[i] = Vector(5 - (sf*i + jitter*(0.5 - math.random()))*timeConstant, 0)
		timeArray[i] = timeConstant
	end
	for i = math.ceil(change), 250 do
		speedArray[i] = speedArray[i-1] - Vector((rf + jitter*(0.5 - math.random()))*timeConstant, 0)
		timeArray[i] = timeConstant
	end
	return speedArray, timeArray
end

local function CreateShot2()
	local speedArray = {Vector(5, 0)}
	local timeArray = {timeConstant}
	local scale = (sf-rf)/math.pi
	for i = 2, 250 do
		speedArray[i] = speedArray[i-1] - Vector(((math.atan((change-i)/5) + jitter*(0.5 - math.random())) + 1.9)*scale*timeConstant, 0)
		--log("accelerationArray["..(i-1).."] = "..(speedArray[i-1].x - speedArray[i].x)*100)
		timeArray[i] = timeConstant
	end
	return speedArray, timeArray
end

return {
testStatic = function()
	BallAnalyzer:init(nil, nil, nil, -3.5, -0.5)
	BallAnalyzer._record, BallAnalyzer._times = CreateShot()
	local sl, ro
	log("---------------------------------------------CreateShot()-------------------------------------------------------------------------")
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "..math.average(sl).." | Rolling friction: "..math.average(ro))
	BallAnalyzer._record, BallAnalyzer._times = CreateShot2()
	log("---------------------------------------------CreateShot2()------------------------------------------------------------------------")
	sl, ro = BallAnalyzer:analyze()
	log("Sliding friction: "..math.average(sl).." | Rolling friction: "..math.average(ro))
end
}
