local Processor = require "../base/processor"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local Coordinator = require "control/coordinator"

local function hasBall()
	-- choose one robot, no opponents
	local robot = World.FriendlyRobots[1]

	local positive = false -- detect flickering
	Processor.addPost(function()
		local current = robot.hasBall(World.Ball)
		if positive ~= current then
			if positive then
				log("<font color=\"darkgreen\">Robot has the ball</font>")
			else
				log("<font color=\"red\">Robot does not have the ball</font>")
			end
		end
	end)
end

local function pass()
	-- position robots

	-- Processor.addPost() -- measure time

end


local function cornerKickOffensive()
	-- set referee state

	-- position robots

	-- Processor.addPost() --

end


local init = false
local coordinator = Coordinator.create()
local function wrapper(func)
	if not init then
		if not pcall(require, 'debug') then 
			error("Debugging not enabled!") 
		end
		func()
		init = true
	end
	coordinator:run()
end

Entrypoints.add("Situations/Has ball", function() wrapper(hasBall) end)
Entrypoints.add("Situations/Pass", function() end)
Entrypoints.add("Situations/Cornerkick offensive", function() end)
