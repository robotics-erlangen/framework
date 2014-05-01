--[[
--- Contains system specific constants. That is constants that are due to intrinsic properties of the robots / camera system / game rules.
-- See source for constant and description
module "Constants"
]]--

local Constants = {}

Constants.stopBallDistance = 0.5 -- distance to ball during stop [m]

Constants.systemLatency = 0.1 -- total system latency [s]

Constants.positionError = 0.005 -- possible position error from vision [m]

Constants.maxBallSpeed = 8 -- maximum allowed shooting speed [m/s]

Constants.maxDribbleDistance = 0.5

Constants.maxRobotRadius = 0.09

function Constants.switchSimulatorConstants(isSimulated)
	if isSimulated then
		Constants.ballDeceleration = -0.65
		Constants.fastBallDeceleration = -3.5
		Constants.ballSwitchRatio = 0.65
	else
		-- measured by looking at the ball speed graph in the plotter
		Constants.ballDeceleration = -0.3 -- acceleration which brakes the ball [m/s^2]
		Constants.fastBallDeceleration = -2.5 -- accerlation which brakes the ball until it is rolling [m/s^2]
		Constants.ballSwitchRatio = 0.6 -- if ball is slower than switchRatio * shootSpeed then switch from fast to normal ball deceleration
	end
end

Constants.switchSimulatorConstants(false)

return Constants
