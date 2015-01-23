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

-- Requires Lua Development Tools for Eclipse
-- http://www.eclipse.org/koneki/ldt/ (version >= 1.0)
-- !!! Copy the debugger file provided by ldt to this folder as debugger.lua !!!
-- Requires luasocket2 c library on the lua load path! (version >= 2.1)
-- See README of ra for luasocket install instructions

-- Howto
-- Create a project for the strategy folder, then connect to ra using "Lua Attach to Application"
-- Choose the created project as debug target and leave every other setting at its default value!

-- add 'require "../test/debug/enable"' to the entrypoint wrapper or somewhere else inside an entrypoint
-- adding it outside can require several tries until the connection was successful,
-- as the strategy may be reloaded during the initial entrypoint selection

-- In ra 'enable debugging', then start the remote debugger in eclipse and reload the strategy

-- During debugging the strategy timeout is disabled, thus if the script has an inifinite loop it will only terminate when stopping it via the debugger!
-- Debugging is quite slow

-- On windows a cmd window will show for a moment when the debugger is initialized.

-- Possible errors:
-- Cannot connect to 127.0.0.1:10000 : connection refused
-- -> Eclipse is not running / debugging was not started
-- closed
-- -> Debugging not started or timed out
-- module 'mime.core' not found
-- -> luasocket2 is missing!

if not amun.isDebug then
	error("Ra must be run in debug mode")
end

-- preload socket libraries
package.preload["ltn12"] = function() return require "../test/debug/ltn12" end
package.preload["mime"] = function() return require "../test/debug/mime" end
package.preload["socket"] = function() return require "../test/debug/socket" end

local initConnection = require "../test/debug/debugger"

-- patch debugger commands
local cmds = require "debugger.commands"

-- used to stop the simulator while execution is suspended
local function setScaling(scaling)
	amun.sendCommand({
		speed = scaling
	})
end

-- handle continuation commands
local function wrapContinue(t, name)
	local func = t[name]
	t[name] = function(...)
		setScaling(1)
		return func(...)
	end
end

wrapContinue(cmds, "run")
wrapContinue(cmds, "step_over")
wrapContinue(cmds, "step_out")
wrapContinue(cmds, "step_into")
-- does the same as the os.exit wrapper
wrapContinue(cmds, "stop")

local core = require "debugger.core"
-- is always called when execution is suspended
local pcr = core.previous_context_response
function core.previous_context_response(...)
	setScaling(0)
	return pcr(...)
end
	
-- don't puzzle the user with strategy no longer running
-- after killing the strategy if it was suspended
local osexit = os.exit
function os.exit(...)
	-- restart timer before exiting strategy
	setScaling(1)
	return osexit(...)
end

initConnection()
