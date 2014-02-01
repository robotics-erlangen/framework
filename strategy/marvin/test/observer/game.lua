local GameTest = {}

local Game = require "observer/game"
local vis = require "../base/vis"

function GameTest.testGameFocus()
	vis.addCircle("Game Focus", Game.gameFocus(), 0.05, vis.colors.red, false)
end

return GameTest
