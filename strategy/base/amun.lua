--[[
--- API for Ra. <br/>
-- Amun offers serveral guarantees to the strategy: <br/>
-- The values returned by getGeometry, getTeam, isBlue are guaranteed to remain constant for the whole strategy runtime.
-- That is if any of the values changes the strategy is restarted! <br/>
-- If coordinates are passed via the API these values are using <strong>global</strong> coordinates!
-- This API may only be used by coded that provides a mapping between Amun and Strategy
module "amun"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Philipp Nordhus     *
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

--- Returns world state
-- @class function
-- @name getWorldState
-- @return protobuf.world.State - converted to lua table

--[[
separator for luadoc]]--

--- Returns world geometry
-- @class function
-- @name getGeometry
-- @return protobuf.world.Geometry - converted to lua table

--[[
separator for luadoc]]--

--- Returns team information
-- @class function
-- @name getTeam
-- @return protobuf.robot.Team - converted to lua table

--[[
separator for luadoc]]--

--- Query team color
-- @class function
-- @name isBlue
-- @return bool - true if this is the blue team, false otherwise

--[[
separator for luadoc]]--

--- Add a visualization
-- @class function
-- @name addVisualization
-- @param vis protobuf.amun.Visualization as table

--[[
separator for luadoc]]--

--- Set commands for a robot
-- @class function
-- @name setCommand
-- @param int generation
-- @param int robotid
-- @param cmd protobuf.robot.StrategyCommand

--[[
separator for luadoc]]--

--- Log function.
-- If data is a string use ... as parameters for format.
-- Otherweise logs tostring(data)
-- @class function
-- @name log
-- @param data any - data to log
-- @param ... any - params for format (optional)

--[[
separator for luadoc]]--

--- Returns game state and referee information
-- @class function
-- @name getGameState
-- @return protobuf.GameState - converted to lua table

--[[
separator for luadoc]]--

--- Returns the user input
-- @class function
-- @name getUserInput
-- @return protobuf.UserInput - converted to lua table

--[[
separator for luadoc]]--

--- Returns current time
-- @class function
-- @name getCurrentTime
-- @return Number - time in nanoseconds (amun), seconds(strategy)

--[[
separator for luadoc]]--

--- Returns the absolute path to the folder containing the init script
-- @class function
-- @name getStrategyPath
-- @return String - path

--[[
separator for luadoc]]--

--- Returns list with names of enabled options
-- @class function
-- @name getSelectedOptions
-- @return String[] - options

--[[
separator for luadoc]]--

--- Sets a value in the debug tree
-- @class function
-- @name addDebug
-- @param key string
-- @param value number|bool|string|nil

--[[
separator for luadoc]]--

--- Add a value to the plotter
-- @class function
-- @name addPlot
-- @param name string
-- @param value number

--[[
separator for luadoc]]--

--- Send arbitrary commands. Only works in debug mode
-- @class function
-- @name sendCommand
-- @param command amun.Command

--[[
separator for luadoc]]--

--- Send internal referee command. Only works in debug mode. Must be fully populated
-- @class function
-- @name sendRefereeCommand
-- @param command SSL_Referee

--[[
separator for luadoc]]--

--- Send mixed team info packet
-- @class function
-- @name sendMixedTeamInfo
-- @param data ssl::TeamPlan

--[[
separator for luadoc]]--

--- Send referee command over network. Only works in debug mode or as autoref. Must be fully populated
-- Only sends the data passed to the last call of this function during a strategy run.
-- The command_counter must be increased for every command change
-- @class function
-- @name sendNetworkRefereeCommand
-- @param command SSL_Referee

-- luacheck: globals amun log
require "amun"
log = amun.log
-- publish debug status
amun.isDebug = pcall(require, "debug")

-- prevent direct access to the amun api by other code
function amun._hideFunctions()
	local isDebug = amun.isDebug
	local strategyPath = amun.getStrategyPath()
	local getCurrentTime = amun.getCurrentTime
	local sendCommand = amun.sendCommand
	local sendNetworkRefereeCommand = amun.sendNetworkRefereeCommand
	local sendAutorefEvent = amun.sendAutorefEvent

	-- overwrite global amun
	amun = {
		isDebug = isDebug,
		strategyPath = strategyPath,
		sendAutorefEvent = sendAutorefEvent,
		getCurrentTime = function ()
			return getCurrentTime() * 1E-9
		end
	}
	if isDebug then
		amun.sendCommand = sendCommand
		amun.sendNetworkRefereeCommand = sendNetworkRefereeCommand
	else
		amun.sendNetworkRefereeCommand = function()
			error "you must enable debug in order to send referee commands"
		end
	end

	-- prevent reloading original api
	package.preload["amun"] = nil
	-- update reference used by require
	package.loaded["amun"] = amun
end
