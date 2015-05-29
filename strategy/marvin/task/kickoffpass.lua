local KickoffPass = Class("Task.KickoffPass", require "task/base")
local SuggestPass = require "task/ability/suggestpass"

local ToTarget = require "trajectory/totarget"
local Rating = require "util/rating"
local World = require "../base/world"
local G = World.Geometry
local debug = require "../base/debug"


function KickoffPass:_init(pos, dir)
	--self._send.kickoffPass("all", 0)

	self._pos = pos
	self._dir = dir
end

function KickoffPass:run()
	self._send.kickoffPass("all", self._pos)
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)

	--self._robot.trajectory:update(ToTarget, self._pos, self._dir)
	if self._inbox.kickoffStart() ~= nil then
		debug.set("kickoffStart", "true")
	end
	if World.RefereeState == "KickoffOffensive" and self._inbox.kickoffStart() ~= nil then --World.RefereeState == "KickoffOffensive" then
		local moveDest, moveTime = self._robot.trajectory:update(ToTarget, Vector(self._pos.x, -self._pos.y*0.6), self._dir)
		debug.set("target", moveTime)
		self._send.targetTime("all", moveTime)
		--if moveTime <= 1 then
			return SuggestPass
		--end
	else
		self._robot.trajectory:update(ToTarget, self._pos, self._dir)
	end
	return MoveToStaticBall, { math.pi/2, 0.05 }
end

return KickoffPass
