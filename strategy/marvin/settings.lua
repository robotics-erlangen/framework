local settings = {}

settings.DEBUG = true -- enables debug output (logs and debug trees)

settings.positionPadding = 0.02 -- safety distance

settings.ballOwnDistance = 0.1 -- we own the ball if it was at least once only 10cm away from our robot
settings.ballOwnHysteresis = 0.05
settings.keeperGoalDistance = 0.02 -- how far the keeper should stay away from the goal, used in task/keeper
settings.slowBall = 0.5 -- consider a ball as moving if faster than this limit [m/s]
settings.fastBall = 1.5 -- consider a ball as fast if faster than this limit [m/s]
settings.tiltShotAngle = 45/180*math.pi -- the max offset angle for tilted and volley shots
settings.shootDriveSpeed = 0.2
settings.shootProbabilityThreshold = 0.8 --we instantly shoot if the probability that no opponent robot blocks it is at least 80% 
settings.markingDistance = 0.05 -- close enough
settings.distanceHysteresis = 0.03 -- use it as a hysteresis value for all minimum/maximum distance search loops

Settings = table.readonlytable(settings)

return Settings
