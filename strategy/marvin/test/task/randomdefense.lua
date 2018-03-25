local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local CenterBack = require "task/defender/centerback"
local TestHelper = require "test/helper/agent"


local G = World.Geometry
local N = 3

-----------------------------
-------- ! CAUTION ! --------
-----------------------------
-- in task/centerback:     --
-- increase "getImportant" --
-- drastically to avoid    --
-- collisions              --
-----------------------------

local Defend = Class("Test.Task.RandomDefense.Defend", require "agent/base/behavior")

function Defend:check()
	-- disable behavior to trigger a reset
	return math.random() >= 0.003
end

function Defend:_updateTask()
	local x = math.random() * G.FieldWidth - G.FieldWidthHalf
	local y = - math.random() * G.FieldHeightHalf
	local destPosition = Vector(x, y)

	return CenterBack, { { pos = destPosition } }
end


local DefendAgent = Class("Test.Task.RandomDefense.DefendAgent", require "agent/base/simpleagent")
DefendAgent._behaviors = {
	Defend
}


local run = TestHelper.defaultCoordinator("defend", DefendAgent, N)
Entrypoints.add("TaskTest/Random Defense", run)
