-- To run the strategy in Ra you need to select this init script in the team widget
-- The init script *has* to be named "init.lua"

-- All base modules are documented fairly well in code
require("../base/globalschecker").enable()
require "../base/base"

-- Add entrypoints for selection in Ra
local Entrypoints = require "../base/entrypoints"
-- Access to the debug tree
local debug = require "../base/debug"
-- Used here to dump locals on crash
local debugger = require "../base/debugger"
-- Holds world state and geometry
local World = require "../base/world"
-- Support for visualizations
local vis = require "../base/vis"
-- For adding data to the plotter
local plot = require "../base/plot"

local directionChangeTime
local spline =  { { t_start = 0, t_end = math.huge,
					x = { a0 = 0, a1 = 0.5, a2 = 0, a3 = 0 },
					y = { a0 = 0, a1 = 0, a2 = 0, a3 = 0 },
					phi = { a0 = 0, a1 = 0, a2 = 0, a3 = 0 }
				} }
local frameCount = 0

local main = function()
	if frameCount % 100 == 0 then
		-- Use log() to output data in Ra's log widget
		log("Strategy run")
	end
	frameCount = frameCount + 1

	-- Various visualizations can be added (circle, path, polygon, axis aligned rectangle, pizza)
	-- For their method signatures see base/vis
	-- For information about ball objects see base/ball
	vis.addPath("ball speed", { World.Ball.pos, World.Ball.pos + World.Ball.speed }, vis.colors.red, nil, nil, 2 * World.Ball.radius)

	-- Add information to the debug tree
	-- Sub-trees can be created using path-like key names or with debug.push()
	debug.set("Ball/pos", World.Ball.pos)
	debug.push("Ball")
	debug.set("speed", World.Ball.speed)
	debug.pop()

	-- Time is in seconds
	if World.Time - directionChangeTime > 2 then
		directionChangeTime = World.Time
		spline[1].x.a1 = -spline[1].x.a1
	end
	-- One of the methods to get a team's robots
	local robot = World.FriendlyRobotsById[0]
	if robot then
		spline[1].x.a0 = robot.pos.x
		spline[1].y.a0 = robot.pos.y
		robot:setControllerInput({ spline = spline })
	end
end

Entrypoints.add("Demo", main)
-- You can also create a hierarchy of entrypoints
Entrypoints.add("Sub/Demo", main)

-- The strategy runs at a maximum frequency of 100Hz.
-- In case the strategy takes more than 10ms for a frame, only the latest available tracking output is used.
-- The strategy's wrapper function is called with the selected entrypoint passed as its first parameter
local wrapper = function (func)
	local f = function()
		-- Has to be called each frame
		World.update()

		-- Used for driving arround a bit
		if not directionChangeTime then
			directionChangeTime = World.Time
		end

		-- Call the selected entrypoint
		func()

		-- Call this function to pass robot commands set during the strategy run back to amun
		World.setRobotCommands()
		-- Clear the debug tree. Otherwise old output would pile up
		debug.resetStack()
		plot._plotAggregated()
	end
	return debugger.dumpLocalsOnError(f)
end

-- entrypoints is a lua table mapping entrypoint names to lua functions
return { name = "Demo Strategy", entrypoints = Entrypoints.get(wrapper) }
