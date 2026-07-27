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

local Injector = require "test/unit/injector"

local function tmp()
end

local function wrapper_const(func)
	return func
end

local function wrapper_other(_func)
	return wrapper_other
end

context("base.entrypoints", function()
	local Entrypoints
	before(function()
		local injector = Injector(nil, true)
		Entrypoints = injector:load("../base/entrypoints")
	end)

	test("wrapper", function ()
		local name = "test"
		Entrypoints.add(name, tmp)

		local eps = Entrypoints.get(wrapper_const)
		assert_not_nil(eps[name], "Entrypoint is missing")
		assert_equal(eps[name], tmp, "Wrong wrapper function got called")

		local eps2 = Entrypoints.get(wrapper_other)
		assert_equal(eps2[name], wrapper_other, "Wrong wrapper function got called")
	end)

	test("duplicates", function()
		Entrypoints.add("test", tmp)
		assert_error(function() Entrypoints.add("test", tmp) end,
				"Entrypoints may not be overwritten")
	end)

end)
