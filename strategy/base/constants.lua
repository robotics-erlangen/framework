--[[
--- Contains system specific constants. That is constants that are due to intrinsic properties of the robots / camera system / game rules.
-- See source for constant and description
module "Constants"
]]--

local Constants = {}

-- measured by looking at the ball speed graph in the plotter
Constants.ballDeceleration = -0.5 -- acceleration which brakes the ball [m/s^2]

Constants.stopBallDistance = 0.5 -- distance to ball during stop [m]

Constants.systemLatency = 0.1 -- total system latency [s]

Constants.positionError = 0.005 -- possible position error from vision [m]

Constants.maxBallSpeed = 8 -- maximum allowed shooting speed [m/s]

return Constants
