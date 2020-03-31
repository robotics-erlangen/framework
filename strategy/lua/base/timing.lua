--[[***********************************************************************
*   Copyright 2020 Christian Lobmeier, Andreas Wendler                    *
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

local timing = {}

local debug = require "../base/debug"
local plot = require "../base/plot"

local startTimes = {}

function timing.start(name, robotId)
	local key = name .. "." .. tostring(robotId)
	if startTimes[key] then
		error("multiple start calls")
	end

	startTimes[key] = amun.getCurrentTime()
end

function timing.finish(name, robotId)
	local key = name .. "." .. tostring(robotId)
	if not startTimes[key] then
		error("no start call")
	end

	local timeDiffMs = (amun.getCurrentTime() - startTimes[key]) * 1000
	if timeDiffMs < 0.001 then
		timeDiffMs = 0
	end

	debug.push("Timing")
	debug.set(name, string.sub(tostring(timeDiffMs), 0, 5) .. "ms")
	debug.pop()

	plot.addPlot(key, timeDiffMs)

	startTimes[key] = nil
end

return timing
