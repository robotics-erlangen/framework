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

--- Add a circle
-- @class function
-- @name addVisualizationCircle
-- @param string name
-- @param number centerX
-- @param number centerY
-- @param number radius
-- @param number colorRed
-- @param number colorGreen
-- @param number colorBlue
-- @param number colorAlpha
-- @param bool isFilled
-- @param bool background
-- @param number linewidth

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

--- Set the exchange symbol for a robot
-- @class function
-- @name setRobotExchangeSymbol
-- @param generation number
-- @param id number
-- @param exchange bool

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

--- Write output to debugger console
-- @class function
-- @name debuggerWrite
-- @param line string

--[[
separator for luadoc]]--

--- Wait for and read input from debugger console
-- @class function
-- @name debuggerRead
-- @return line string

--[[
separator for luadoc]]--

--- Check if performance mode is active
-- @class function
-- @name getPerformanceMode
-- @return mode boolean

--[[
separator for luadoc]]--

--- Returns true if and only if this strategy is the internal autoref embedded in a Ra instance
-- it returns false if this is the actual autoref running a dedicated program
-- @class function
-- @name isInternalAutoref
-- @return isAutoref boolean

-- luacheck: globals amun log
require "amun"
log = amun.log
-- publish debug status
local hasDebugTable = pcall(require, "debug")
amun.isDebug = hasDebugTable and debug.sethook ~= nil
amun.isPerformanceMode = true
if amun.getPerformanceMode then
	amun.isPerformanceMode = amun.getPerformanceMode()
end

-- prevent direct access to the amun api by other code
function amun._hideFunctions()
	local isDebug = amun.isDebug
	local strategyPath = amun.getStrategyPath()
	local getCurrentTime = amun.getCurrentTime
	local sendCommand = amun.sendCommand
	local performanceMode = amun.isPerformanceMode
	local connectGameController = amun.connectGameController
	local sendGameController = amun.sendGameControllerMessage
	local receiveGameController = amun.getGameControllerMessage
	local isInternalAutoref = amun.isInternalAutoref

	-- overwrite global amun
	amun = {
		isDebug = isDebug,
		isInternalAutoref = isInternalAutoref,
		strategyPath = strategyPath,
		getCurrentTime = function ()
			return getCurrentTime() * 1E-9
		end,
		setRobotExchangeSymbol = amun.setRobotExchangeSymbol,
		isPerformanceMode = performanceMode,
		connectGameController = connectGameController,
		sendGameControllerMessage = sendGameController,
		getGameControllerMessage = receiveGameController
	}
	if isDebug then
		amun.sendCommand = sendCommand
	end

	-- prevent reloading original api
	package.preload["amun"] = nil
	-- update reference used by require
	package.loaded["amun"] = amun

	-- lua debug funcitons are only accessible with enabled debug
	if not isDebug and hasDebugTable then
		-- luacheck: push globals debug
		debug = nil
		-- luacheck: pop
		package.preload["debug"] = nil
		package.loaded["debug"] = nil
	end
end
