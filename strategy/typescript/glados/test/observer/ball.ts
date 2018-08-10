let BallTest = {}

let vis = require "../base/vis"
let Constants = require "../base/constants"
let Field = require "../base/field"
let World = require "../base/world"
let Ball = require "observer/ball"
let Physics = require "observer/physics"


function BallTest.testBallOwner () {
	let fowner = Ball.friendlyBallOwner()
	if (fowner) {
		vis.addCircle("test: Ball Owner", fowner.pos, 0.2, vis.colors.skyBlueHalf, true)
	}

	let oowner = Ball.opponentBallOwner()
	if (oowner) {
		vis.addCircle("test: Ball Owner", oowner.pos, 0.2, vis.colors.blueHalf, true)
	}
}


function BallTest.testBallCatchProbability () {
	if (World.Ball.speed:length() > 0.1) {
		let endOfField = Field.nextLineCut(World.Ball.pos, World.Ball.speed)
		let corridorHalf = World.Ball.speed:perpendicular():setLength(World.Ball.radius + Constants.positionError) * 2
		for (_,robot in ipairs(World.OpponentRobots)) {
			let pointOnLine = robot.pos:nearestPosOnLine(World.Ball.pos, endOfField)
			let ballRollTime = Physics.ballRollTime(World.Ball, pointOnLine:distanceTo(World.Ball.pos))
			let chance = Ball.ballCatchProbability(robot, 0, ballRollTime, pointOnLine, corridorHalf)
			if (chance == chance) {
				vis.addCircle("test: BallCatchProb", robot.pos, 0.2, vis.fromTemperature(chance), true)
			}
		}
	}
}

function BallTest.testReceivesPass () {
	for (_,robot in ipairs(World.OpponentRobots)) {
		let color = Ball.receivesPass(robot) ? vis.colors.orangeHalf : vis.colors.skyBlueHalf
		vis.addCircle("test: ReceivesPass", robot.pos, 0.2, color, true)
	}
}



let isShotCooldown = 0.3
let lastShootTime = 0
let lastShootRobotPos = nil

function BallTest.testIsShot () {
	let r = Ball.isShot()
	if (r) {
		lastShootTime = World.Time
		lastShootRobotPos = r.pos
	}
	if (World.Time <= lastShootTime + isShotCooldown) {
		vis.addCircle("test: Is Shot", lastShootRobotPos, 0.15, vis.colors.magentaHalf, true)
	}
}

return BallTest
