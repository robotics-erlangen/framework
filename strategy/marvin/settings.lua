local settings = {}

settings.DEBUG = true -- enables debug output (logs and debug trees)

settings.positionPadding = 0.02 -- safety distance

settings.ballOwnDistance = 0.07 -- we own the ball if it was at least once only 10cm away from our robot
settings.ballOwnHysteresis = 0.03
settings.keeperGoalDistance = 0.02 -- how far the keeper should stay away from the goal, used in task/keeper
settings.slowBall = 0.5 -- consider a ball as moving if faster than this limit [m/s]
settings.fastBall = 1.5 -- consider a ball as fast if faster than this limit [m/s]
settings.tiltShotAngle = 45/180*math.pi -- the max offset angle for tilted and volley shots
settings.shootDriveSpeed = 0.2
settings.dribbleDriveSpeed = 1 -- we can dribble backwards with approximately 1 m/s
settings.shootProbabilityThreshold = 0.8 --we instantly shoot if the probability that no opponent robot blocks it is at least 80% 
settings.receiveChipDistance = 0.2 --the distance between the landing point of the chipped ball and the pass receiver
settings.markingDistance = 0.05 -- close enough
settings.distanceHysteresis = 0.03 -- use it as a hysteresis value for all minimum/maximum distance search loops
settings.defenseRiskLevel = 1.5 -- if a defender is catching the ball this is the time he shall have in advance before an oppnonent reaches the ball
settings.penaltyLineDistance = 0.35 -- prevent robots from crossing the penalty line
settings.catchBallDistance = 0.015 -- distance to ball kept by catchBall task

Settings = table.readonlytable(settings)

return Settings
