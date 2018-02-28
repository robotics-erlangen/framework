local WindshieldWiper = Class("Group.Move.WindshieldWiper", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry

local MoveToPos = require "task/movetopos"
local Freekick = require "agent/attacker/freekick"
local StopAttack = require "task/stopattack"

local AcceptPass = require "task/acceptpass"
local Striker = require "task/striker"
local Attack = require "util/attack"

WindshieldWiper.MIN_ROBOTS = 1
WindshieldWiper.MAX_ROBOTS = 5


function WindshieldWiper.canStart()
	if WindshieldWiper.Referee.isFriendlyFreeKickState() then
		return math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
			and World.Ball.pos.y > 3 * G.FieldHeightHalf / 5
		--return true
	end
		return false
end

function WindshieldWiper:_canContinue()
	if WindshieldWiper.Referee.isFriendlyFreeKickState() then
		return true
	end
		return false
end

local function sort(distances, ball)
	local i = 1
	for _,v in ipairs(distances) do
		v.distance = v.robot.pos:distanceToSq(ball.pos)
	end
	while distances[i+1] do
		if distances[i].distance > distances[i+1].distance then
			distances[i],distances[i+1] = distances[i+1],distances[i]
			if i ~=1 then
				i = i-1
			else
				i = i+1
			end
		else
			i = i+1
		end
	end
end

function WindshieldWiper:_init()
	self._state = "init"
	self._distances = {}
	for _,v in ipairs(self._robots) do
		table.insert(self._distances,{robot=v})
	end
	self._positions = {}
	for i=1,#self._robots do
		self._positions[i]=Vector((math.sign(World.Ball.pos.x))*(i/WindshieldWiper.MAX_ROBOTS -0.5) * G.FieldWidth * 0.75, G.FieldHeightQuarter*(8/(5+i)))
	end
	sort(self._distances,World.Ball)

end


function WindshieldWiper:_updateTasks()
	local distances = self._distances
	--sort(distances,World.Ball)
	local mainrobot = distances[1].robot
	local taskAssignments = {}

	if World.RefereeState == "Stop" then
		taskAssignments[mainrobot] = { class = StopAttack, params = { } }
	elseif WindshieldWiper.Referee.isFriendlyFreeKickState() then
		taskAssignments[mainrobot] = { behavior = Freekick }
	end

	local _, passInfoTable = next(self._inbox.passInfo())
	local nr = false
	local pos = self._positions
	for i=2,#self._robots do
		nr = Attack.checkPassInfos(distances[i].robot, passInfoTable, false) and i or nr
		taskAssignments[distances[i].robot] = {class = Striker, params = {Vector(-pos[i].x,pos[i].y),pos[i]}}
	end
	if nr then
		taskAssignments[distances[nr].robot] = { class = AcceptPass}

		for i=2,#self._robots do
			if i~=nr then
				taskAssignments[distances[i].robot] = {class = MoveToPos, params = {pos[i]}}
			end
		end
	end

	return taskAssignments, mainrobot
end
return WindshieldWiper
