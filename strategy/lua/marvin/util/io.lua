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

local IO = {}

require "../base/amun"


local pathToStrategy = amun.strategyPath.."/"

function IO.readLines(module)
	local filename = pathToStrategy..module
	local lines = {}
	local linenumber = 0
	local ok, iterator = pcall(io.lines, filename)
	if not ok then
		return {}
	end
	for line in iterator do
		linenumber = linenumber + 1
		lines[linenumber] = line
	end
	return lines
end

function IO.read(module)
	local filename = pathToStrategy..module
	local params = {}
	local ok, iterator = pcall(io.lines, filename)
	if not ok then
		return {}
	end
	for line in iterator do
		local it = string.gmatch(line, "%w+")
		local key = it(1)
		local value = tonumber(it(2))
		params[key] = value
	end
	return params
end

function IO.save(module, params)
	local filename = pathToStrategy..module
	local f = io.open(filename, "w")
	for key, value in pairs(params) do
		local line = key.." "..tostring(value).."\n"
		f:write(line)
	end
	f:close(filename)
end

function IO.append(module, value)
	local filename = pathToStrategy..module
	local f = io.open(filename, "a")
	f:write(tostring(value).."\n")
	f:close(filename)
end

return IO
