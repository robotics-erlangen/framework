local settings = {}

settings.positionPadding = 0.02 -- safety distance

settings.ballOwnDistance = 0.05 -- we own the ball if it was at least once only 5cm away from our robot
settings.ballOwnHysteresis = 0.1 -- we loose the ball if it gets 5 + 10 cm away
settings.keeperGoalDistance = 0.02 -- how far the keeper should stay away from the goal, used in task/keeper
settings.slowBall = 0.5 -- consider a ball as fast if faster than this limit [m/s]
settings.shootDriveSpeed = 0.2
settings.shootProbabilityThreshold = 0.8 --we instantly shoot if the probability that no opponent robot blocks it is at least 80% 

Settings = table.readonlytable(settings)

return Settings
