local KickoffPass = Class("Task.KickoffPass", require "task/base")
local SuggestPass = require "task/ability/suggestpass"

local Ball = require "observer/ball"
local Game = require "observer/game"
local Physics = require "observer/physics"
local ToTarget = require "trajectory/totarget"
local Rating = require "util/rating"
local World = require "../base/world"
local G = World.Geometry
local debug = require "../base/debug"


function KickoffPass:_init(pos, dir)
	self._pos = pos
	self._dir = dir
end

function KickoffPass:run()
	-- send message that a player is in the back to Main Attacker
	self._send.kickoffPass("all", self._pos)
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)

	if self._inbox.kickoffStart() ~= nil then
		debug.set("kickoffStart", "true")
	end
	if World.RefereeState == "KickoffOffensive" and self._inbox.kickoffStart() ~= nil then --World.RefereeState == "KickoffOffensive" then
	
		--[[local pass = false;
		local dest = Vector(self._pos.x, -self._pos.y*0.35)
		local ballTime = Physics.ballRollTime(World.Ball, World.Ball.pos:distanceTo(dest))
		local sectorLeft, _, sectorRight = Game.divideOpponentsIntoSectors(true)
		local corridorHalf = (dest-World.Ball.pos):perpendicular():setLength(0.5)
		if self._pos.x < 0 then
			for _,robot in ipairs(sectorLeft) do
				local tmp = Ball.ballCatchProbability(robot, 0, ballTime, dest, corridorHalf) 
				debug.set("catchProbability1", tmp)
			end
		else
			for _,robot in ipairs(sectorRight) do
				local tmp = Ball.ballCatchProbability(robot, 0, ballTime, dest, corridorHalf) 
				debug.set("catchProbability2", tmp)
			end
		end
		]]

		local moveDest, moveTime = self._robot.trajectory:update(ToTarget, Vector(self._pos.x, -self._pos.y*0.6), self._dir)
		debug.set("target", moveTime)
		self._send.targetTime("all", moveTime)
	else
		self._robot.trajectory:update(ToTarget, self._pos, self._dir)
	end
end

return KickoffPass
