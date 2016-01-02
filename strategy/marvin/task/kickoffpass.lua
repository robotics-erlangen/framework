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
local PathHelper = require "trajectory/pathhelper"


function KickoffPass:_init(pos, dir)
	self._pos = pos
	self._dir = dir
end

function KickoffPass:run()
	-- send message that a player is in the back to Main Attacker
	self._send.kickoffPass("all", self._pos)
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	if self._inbox.kickoffStart() ~= nil then
		debug.set("kickoffStart", "true")
	end
	if World.RefereeState == "KickoffOffensive" and self._inbox.kickoffStart() ~= nil then
		--change sides you pass to when there are more opponents on current side
		if (Game.attackSideWithLessOpponents() == "left" and self._pos.x == (G.FieldWidthHalf * 0.75)) or 
				(Game.attackSideWithLessOpponents() == "right" and self._pos.x == (-G.FieldWidthHalf * 0.75)) then
			self._pos.x= -self._pos.x
		end
		local moveDest, moveTime = self._robot.trajectory:update(ToTarget, Vector(self._pos.x, -self._pos.y*0.6), self._dir)
		debug.set("target", moveTime)
		self._send.targetTime("all", moveTime)
	else
		self._robot.trajectory:update(ToTarget, self._pos, self._dir)
	end
end

return KickoffPass
