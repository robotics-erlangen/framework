local Settings = {}

Settings.positionPadding = 0.02 -- safety distance

Settings.ballOwnDistance = 0.05 -- we own the ball if it was at least once only 5cm away from our robot
Settings.ballOwnHysteresis = 0.1 -- we loose the ball if it gets 5 + 10 cm away
Settings.keeperGoalDistance = 0.02 -- how far the keeper should stay away from the goal, used in task/keeper
Settings.slowBall = 0.5 -- consider a ball as fast if faster than this limit [m/s]

Settings.shootProbabilityThreshold = 0.8 --we instantly shoot if the probability that no opponent robot blocks it is at least 80% 

return Settings
