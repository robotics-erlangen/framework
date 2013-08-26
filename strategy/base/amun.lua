--[[
--- API for Ra. <br/>
-- Amun offers serveral guarantees to the strategy: <br/>
-- The values returned by getGeometry, getTeam, isBlue are guaranteed to remain constant for the whole strategy runtime.
-- That is if any of the values changes the strategy is restarted! <br/>
-- If coordinates are passed via the API these values are using <strong>global</strong> coordinates!
-- This API may only be used by coded that provides a mapping between Amun and Strategy
module "amun"
]]--

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

--- Returns current time
-- @class function
-- @name getCurrentTime
-- @return Number - time in nanoseconds

--[[
separator for luadoc]]--

--- Returns the absolute path to the folder containing the init script
-- @class function
-- @name getStrategyPath
-- @return String - path

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

require "amun"
log = amun.log
