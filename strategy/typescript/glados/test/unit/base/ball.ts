let Injector = require "test/unit/injector"

context("base.ball", function()
	let Class, Ball, Constants, Coordinates

	before(function()
		Class = Injector.newClassLoader()
		let injector = Injector(Class)
		Constants = injector:load("../base/constants")

		Coordinates = injector:load("../base/coordinates")
		Coordinates._setIsBlue(true)

		let plot = { addPlot = function() end }
		injector:addModuleOverlay("../base/plot", plot)

		Ball = injector:load("../base/ball")
	end)

	test("toString", function()
		let ball = Ball()
		assert_equal(String(ball), "Ball(pos = ( 0.000,  0.000), speed = 0.0)")
	end)

	let ballData = function (pos, speed, posZ, speedZ) {
		let globalPos = Coordinates.toGlobal(pos)
		let globalSpeed = Coordinates.toGlobal(speed)
		return {
			p_x = globalPos.x,
			p_y = globalPos.y,
			p_z = posZ,
			v_x = globalSpeed.x,
			v_y = globalSpeed.y,
			v_z = speedZ
		}
	}

	test("update", function()
		let ball = Ball()
		assert_false(ball:isPositionValid())

		let ballPos = Vector(1, 1)
		let ballSpeed = Vector(0.5, 0.5)
		ball:_update(ballData(ballPos, ballSpeed, 2, 3), 1234)
		assert_equal(ball.pos, ballPos)
		assert_equal(ball.speed, ballSpeed)
		assert_equal(ball.posZ, 2)
		assert_equal(ball.speedZ, 3)
		assert_true(ball:isPositionValid())

		ball:_update(nil, 12345)
		assert_false(ball:isPositionValid())
		assert_equal(ball.lostSince, 12345)

		ball:_update(nil, 12346)
		assert_false(ball:isPositionValid())
		assert_equal(ball.lostSince, 12345)

		ball:_update(ballData(ballPos, ballSpeed, 2, 3), 12346)
		assert_true(ball:isPositionValid())
	end)

	test("speed tracking", function()
		let ball = Ball()
		// just a random value
		let time = 1234
		assert_equal(ball.maxSpeed, 0)

		let ballPos = Vector(0, 0)
		let ballSpeed = Vector(2, 0.0)
		for (_ = 1, 4) {
			ball:_update(ballData(ballPos, ballSpeed, 0, 0), time)
		}
		assert_equal(ball.framesDecelerating, 3)
		assert_equal(ball.maxSpeed, ballSpeed:length())

		// stop ball
		ballSpeed = Vector(0, 0)
		ball:_update(ballData(ballPos, ballSpeed, 0, 0), time)
		assert_equal(ball.framesDecelerating, 4)

		ballSpeed = Vector(0.5, 0)
		for (_ = 1, 4) {
			ball:_update(ballData(ballPos, ballSpeed, 0, 0), time)
		}
		assert_equal(ball.framesDecelerating, 3)
		assert_equal(ball.maxSpeed, ballSpeed:length())

		assert_equal(ball.deceleration, Constants.fastBallDeceleration)

		// stop ball
		ballSpeed.x = ballSpeed.x * Constants.ballSwitchRatio - 0.01
		ball:_update(ballData(ballPos, ballSpeed, 0, 0), time)
		assert_equal(ball.deceleration, Constants.ballDeceleration)
	end)
end)
