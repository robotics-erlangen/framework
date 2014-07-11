local CatchBall = require "task/ability/catchball"
local Shoot = require "task/ability/shoot"
local PassInTheRun = (require "../base/class").newTask("Task.PassInTheRun", require "task/base",
		CatchBall, Shoot)

local World = require "../base/world"
local Robot = require "observer/robot"
local vis = require "../base/vis"
local geom = require "../base/geom"
local debug = require "../base/debug"

function PassInTheRun:_init(targetRobot, shootPos)
	self._targetRobot = assert(targetRobot, "targetRobot is missing")
	self._shootPos = assert(shootPos, "shoot pos is missing")
end

function PassInTheRun:_canShoot()
	local angleDiff = geom.getAngleDiff(self._robot.dir, (self._shootPos - self._robot.pos):angle())
	return math.abs(angleDiff) < 6 / 180 * math.pi
end

function PassInTheRun:run()
	local newSuggestion = self._inbox.passSuggestion()[self._targetRobot]
	if newSuggestion and newSuggestion.pos then
		self._shootPos = newSuggestion.pos
	end
	local linearShoot = Robot.wayToRobotFree(self._robot, self._targetRobot)
	self:_shoot(self._shootPos, Settings.shootDriveSpeed, linearShoot)

	self._send.passSender(self._targetRobot, "in the run")
	self._send.passPos(self._targetRobot, self._shootPos)
	debug.set("targetRobot", self._targetRobot.id)
	debug.set("chip", chipKick)
	vis.addCircle("t/passintherun: ShootPos", self._shootPos, 0.1, vis.colors.blue, true)
end

return PassInTheRun
