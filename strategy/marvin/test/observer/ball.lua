local BallTest = {}

local Ball = require "observer/ball"
local Physics = require "observer/physics"
local World = require "../base/world"
local vis = require "../base/vis"


function BallTest.testBallOwner()
	local fowner = Ball.friendlyBallOwner()
	if fowner then
		vis.addCircle("test: Ball Owner", fowner.pos, 0.2, vis.colors.skyBlueHalf, true)
	end

	local oowner = Ball.opponentBallOwner()
	if oowner then
		vis.addCircle("test: Ball Owner", oowner.pos, 0.2, vis.colors.blueHalf, true)
	end
end

function BallTest.testAtTime()
	local moments = {0.2, 0.5, 1}
	for _,t in pairs(moments) do
		vis.addCircle("test: Future Ball Pos", Ball.atTime(t).pos, World.Ball.radius, vis.colors.orangeHalf, true)
	end
end

local isShotCooldown = 0.3
local lastShootTime = 0
local lastShootRobotPos = nil

function BallTest.testIsShot()
	local time = World.Time
	local r = Ball.isShot()
	if r then
		lastShootTime = World.Time
		lastShootRobotPos = r.pos
	end
	if World.Time <= lastShootTime + isShotCooldown then
		vis.addCircle("test: Is Shot", lastShootRobotPos, 0.15, vis.colors.magentaHalf, true)
	end
end

local shootTime = 0
local positions = {}
local moments = {0, 0.2, 0.5, 1.0, 1.5}
function BallTest.testBallAtTime()
	if Ball.isShot() then
		shootTime = World.Time
		positions = {}
	end

	for _,t in ipairs(moments) do
		if not positions[t] and World.Time >= shootTime + t then
			positions[t] = World.Ball.pos
		end

		if positions[t] then
			vis.addCircle("test: ballAtPos", positions[t], 0.05, vis.colors.greenHalf, true)
		end

		if World.Time < shootTime + t then
			vis.addCircle("test: ballAtPos", Physics.ballAtTime(World.Ball, shootTime + t - World.Time).pos,
				0.05, vis.colors.blueHalf, true)
		end
	end
end

local startTime = 0
local inf_ctr = 0
local ok_ctr = 0
function BallTest.testBallRollTime()
	local ball = {}
	ball.maxSpeed = math.random() * 5 + 3
	ball.speed = Vector.create(0, math.random() * (ball.maxSpeed - 0.2) + 0.1)
	ball.pos = Vector.create(0, 0)
	ball.radius = World.Ball.radius

	local distance = math.random() * 5
	local time = Physics.ballRollTime(ball, distance)
	local distance2 = Physics.ballAtTime(ball, time).pos:length()

	if time + 1 ~= time then
		if math.abs(distance - distance2) > 0.00001 then
			log(distance - distance2)
		else
			ok_ctr = ok_ctr + 1
		end
	else
		inf_ctr = inf_ctr + 1
	end

	if World.Time - startTime >= 1 then
		startTime = World.Time
		log("#INF = " .. inf_ctr .. "    #OK = " .. ok_ctr)
		inf_ctr = 0
		ok_ctr = 0
	end
end

return BallTest
