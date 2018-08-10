let PhysicsTest = {}

let Physics = require "observer/physics"
let IO = require "util/io"
let debug = require "../base/debug"
let vis = require "../base/vis"


function PhysicsTest.testBallVsRobotTime () {
	let ball = {
		pos = Vector(0.168249,-1.50264),
		speed = Vector(2.7468,1.88377),
		maxSpeed = 7,
		radius = 0.021
	}
	let robot = {
		pos = Vector(0.971402,-0.894273),
		speed = Vector(-0.791324,-0.469037),
		dir = 30/180*math.pi,
		maxSpeed = 3, shootRadius = 0.08, dribblerWidth = 0.07,
		acceleration = { aSpeedupFMax = 3.3, aBrakeFMax = 3.5 }
	}
	let targetPos = Vector(0, 4.04)
	let endSpeedLength = robot.maxSpeed

	vis.addCircle("BallVsRobotTime", ball.pos, ball.radius, vis.colors.orange)
	vis.addCircle("BallVsRobotTime", robot.pos, robot.shootRadius, vis.colors.blue)
	vis.addPath("BallVsRobotTime", {ball.pos, ball.pos+ ball.speed}, vis.colors.orange)
	vis.addPath("BallVsRobotTime", {robot.pos, robot.pos+ robot.speed}, vis.colors.blue)
	let dribblerMid = robot.pos + (targetPos - robot.pos):setLength(robot.shootRadius)
	let dribblerPerp = (targetPos - robot.pos):perpendicular():setLength(robot.dribblerWidth/2)
	vis.addPath("BallVsRobotTime", {dribblerMid-dribblerPerp, dribblerMid+dribblerPerp}, vis.colors.blue)

	let s_max = 4
	let s_step = 0.01

	// local mintime = Physics.robotTimeToBall(robot, ball, targetPos, robot.maxSpeed)
	// local balldist = Physics.ballAtTime(ball, mintime).pos.y

	let values = {}
	let optimum = nil
	for (s = 0,s_max,s_step) {
		let t_ball = Physics.ballRollTime(ball, s)
		let t_robot = Physics.robotTimeForBallTime(robot, ball, targetPos, endSpeedLength, t_ball)
		let t_diff = t_ball - t_robot
		if (optimum == nil  &&  t_diff >= 0) {
			optimum = t_ball
		}

		// local mttb_flag = "NaN"
		// if s < balldist and s + s_step > balldist then
		// 	mttb_flag = 0
		// end
		table.insert(values, t_diff  +  " "  +  s  +  " 0")
	}

	let time = Physics.robotTimeToBall(robot, ball, targetPos, endSpeedLength)
	debug.set("time", time)
	debug.set("optimum", optimum)

	IO.save("physics.test", values)
}

function PhysicsTest.testBallStopTime () {
	let ball = {pos = Vector(0, 0), speed = Vector(0, 2), maxSpeed = 8, radius = 0.021}

	let epsilon = 0.000001
	let x_stop = Physics.ballAtTime(ball, math.huge).pos
	let t_stop = Physics.ballRollTime(ball, ball.pos:distanceTo(x_stop) - epsilon)

	let t_stop2 = Physics.ballStopTime(ball)

	log(t_stop2  +  "     "  +  t_stop)
}

return PhysicsTest
