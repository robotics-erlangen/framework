--[[
--- Send metric data to ra
module "metric"
]]--

--[[***********************************************************************
*   Copyright 2025 Andreas Wendler                                        *
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

local metric = {}

local amun = amun

--- Add metric value
-- @name addMetric
-- @param name string - Metric name
-- @param value number - value of metric
-- @param divisor number - divisor for the metric
function metric.addMetric(name, value, divisor)
	if (amun.addMetric) then
		amun.addMetric(name, value, divisor)
	end
end

return metric
