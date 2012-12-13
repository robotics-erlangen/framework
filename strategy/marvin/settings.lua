local Settings = {}
-- TODO: add settings

Settings.positionPadding = 0.02
Settings.forceKeeperId = nil -- set to robot id to force using this robot as keeper

Settings.ballOwnDistance = 0.05
Settings.ballOwnHysteresis = 0.1
Settings.keeperGoalDistance = 0.05 --used in task/keeper

return Settings
