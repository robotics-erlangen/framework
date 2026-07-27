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

context("base.globalschecker", function()
	local GlobalsChecker, globalEnv

	before(function()
		local injector = Injector(nil, true)
		GlobalsChecker = injector:load("../base/globalschecker")
		-- get global environment as seen by the GlobalsChecker
		globalEnv = getfenv(GlobalsChecker.enable)._G
	end)

	local function set_global()
		-- explicitly access the global table as telescope calls the function with
		-- an function environment
		globalEnv.globalValue = 5
	end

	local function read_global()
		-- luacheck: globals globalValue, ignore tmp
		local tmp = globalEnv.globalValue
	end

	test("read write", function()
		GlobalsChecker.enable()
		GlobalsChecker._init(true)

		-- in debug mode every access to an undefined global is an error
		assert_error(set_global, "Must not write undefined globals")
		assert_error(read_global, "Must not read undefined globals")

		GlobalsChecker.enable({ globalValue = true })

		assert_not_error(set_global, "Must not block write of defined globals")
		assert_not_error(read_global, "Must not block read of defined globals")
	end)
end)
