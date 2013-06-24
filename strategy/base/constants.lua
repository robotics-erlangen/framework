--[[
--- Contains system specific constants. That is constants that are due to intrinsic properties of the robots / camera system / game rules.
-- See source for constant and description
module "Constants"
]]--

local Constants = {}

-- measured by looking at the ball speed graph in the plotter
Constants.ballDeceleration = -0.22 -- acceleration which brakes the ball [m/s^2]
Constants.fastBallDeceleration = -4.0 -- accerlation which brakes the ball until it is rolling [m/s^2]
Constants.ballSwitchRatio = 0.7 -- if ball is slower than switchRatio * shootSpeed then switch from fast to normal ball deceleration

Constants.stopBallDistance = 0.5 -- distance to ball during stop [m]

Constants.systemLatency = 0.1 -- total system latency [s]

Constants.positionError = 0.005 -- possible position error from vision [m]

Constants.maxBallSpeed = 8 -- maximum allowed shooting speed [m/s]

Constants.maxDribbleDistance = 0.5

return Constants
