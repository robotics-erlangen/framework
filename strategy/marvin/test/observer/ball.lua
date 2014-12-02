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
local posAtSec00 = nil
local posAtSec05 = nil
local posAtSec10 = nil
local posAtSec15 = nil
function BallTest.testBallAtTime()
	if Ball.isShot() then
		shootTime = World.Time
		posAtSec00 = World.Ball.pos
		posAtSec02 = nil
		posAtSec05 = nil
		posAtSec10 = nil
		posAtSec15 = nil
	end

	if World.Time <= shootTime + 5 then
		if not posAtSec02 and World.Time >= shootTime + 0.2 then
			posAtSec02 = World.Ball.pos
		end
		if not posAtSec05 and World.Time >= shootTime + 0.5 then
			posAtSec05 = World.Ball.pos
		end
		if not posAtSec10 and World.Time >= shootTime + 1.0 then
			posAtSec10 = World.Ball.pos
		end
		if not posAtSec15 and World.Time >= shootTime + 1.5 then
			posAtSec15 = World.Ball.pos
		end


		vis.addCircle("test: ballAtPos", posAtSec00, 0.05, vis.colors.greenHalf, true)
		if posAtSec02 then
			vis.addCircle("test: ballAtPos", posAtSec02, 0.05, vis.colors.greenHalf, true)
		end
		if posAtSec05 then
			vis.addCircle("test: ballAtPos", posAtSec05, 0.05, vis.colors.greenHalf, true)
		end
		if posAtSec10 then
			vis.addCircle("test: ballAtPos", posAtSec10, 0.05, vis.colors.greenHalf, true)
		end
		if posAtSec15 then
			vis.addCircle("test: ballAtPos", posAtSec15, 0.05, vis.colors.greenHalf, true)
		end

		if World.Time < shootTime + 0.2 then
			vis.addCircle("test: ballAtPos", Physics.ballAtTime(World.Ball, shootTime + 0.2 - World.Time).pos,
				0.05, vis.colors.blueHalf, true)
		end
		if World.Time < shootTime + 0.5 then
			vis.addCircle("test: ballAtPos", Physics.ballAtTime(World.Ball, shootTime + 0.5 - World.Time).pos,
				0.05, vis.colors.blueHalf, true)
		end
		if World.Time < shootTime + 1.0 then
			vis.addCircle("test: ballAtPos", Physics.ballAtTime(World.Ball, shootTime + 1.0 - World.Time).pos,
				0.05, vis.colors.blueHalf, true)
		end
		if World.Time < shootTime + 1.5 then
			vis.addCircle("test: ballAtPos", Physics.ballAtTime(World.Ball, shootTime + 1.5 - World.Time).pos,
				0.05, vis.colors.blueHalf, true)
		end
	end

end

return BallTest
