local TestAgent = require "agent/testagent"
local Entrypoints = require "../base/entrypoints"
local CenterBack = require "task/centerback"
local Messaging = require "control/messaging"
local World = require "../base/world"
local G = World.Geometry


local N = 3

local destPositions = {}
local agents = {}


-----------------------------
-------- ! CAUTION ! --------
-----------------------------
-- in task/centerback:     --
-- increase "getImportant" --
-- drastically to avoid    --
-- collisions              --
-----------------------------


local function run()
	for i = 1,N do
		local r = World.FriendlyRobots[i]
		if not destPositions[i] or math.random() < 0.003 then
			local x = math.random() * G.FieldWidth - G.FieldWidthHalf
			local y = - math.random() * G.FieldHeightHalf
			destPositions[i] = Vector(x, y)

			agents[i] = TestAgent(r, {
				task = CenterBack,
				parameters = { { pos = destPositions[i] } }
			})
		end

	end

	Messaging.deliverMessages()

	for i = 1,N do
		agents[i]:run()
	end
end

Entrypoints.add("TaskTest/Random Defense", run)
