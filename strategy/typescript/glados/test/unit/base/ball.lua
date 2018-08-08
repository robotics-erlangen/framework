local Injector = require "test/unit/injector"

context("base.ball", function()
	local Class, Ball, Constants, Coordinates

	before(function()
		Class = Injector.newClassLoader()
		local injector = Injector(Class)
		Constants = injector:load("../base/constants")

		Coordinates = injector:load("../base/coordinates")
		Coordinates._setIsBlue(true)

		local plot = { addPlot = function() end }
		injector:addModuleOverlay("../base/plot", plot)

		Ball = injector:load("../base/ball")
	end)

	test("toString", function()
		local ball = Ball()
		assert_equal(tostring(ball), "Ball(pos = ( 0.000,  0.000), speed = 0.0)")
	end)

	local function ballData(pos, speed, posZ, speedZ)
		local globalPos = Coordinates.toGlobal(pos)
		local globalSpeed = Coordinates.toGlobal(speed)
		return {
			p_x = globalPos.x,
			p_y = globalPos.y,
			p_z = posZ,
			v_x = globalSpeed.x,
			v_y = globalSpeed.y,
			v_z = speedZ
		}
	end

	test("update", function()
		local ball = Ball()
		assert_false(ball:isPositionValid())

		local ballPos = Vector(1, 1)
		local ballSpeed = Vector(0.5, 0.5)
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
		local ball = Ball()
		-- just a random value
		local time = 1234
		assert_equal(ball.maxSpeed, 0)

		local ballPos = Vector(0, 0)
		local ballSpeed = Vector(2, 0.0)
		for _ = 1, 4 do
			ball:_update(ballData(ballPos, ballSpeed, 0, 0), time)
		end
		assert_equal(ball.framesDecelerating, 3)
		assert_equal(ball.maxSpeed, ballSpeed:length())

		-- stop ball
		ballSpeed = Vector(0, 0)
		ball:_update(ballData(ballPos, ballSpeed, 0, 0), time)
		assert_equal(ball.framesDecelerating, 4)

		ballSpeed = Vector(0.5, 0)
		for _ = 1, 4 do
			ball:_update(ballData(ballPos, ballSpeed, 0, 0), time)
		end
		assert_equal(ball.framesDecelerating, 3)
		assert_equal(ball.maxSpeed, ballSpeed:length())

		assert_equal(ball.deceleration, Constants.fastBallDeceleration)

		-- stop ball
		ballSpeed.x = ballSpeed.x * Constants.ballSwitchRatio - 0.01
		ball:_update(ballData(ballPos, ballSpeed, 0, 0), time)
		assert_equal(ball.deceleration, Constants.ballDeceleration)
	end)
end)
