local Shoot = require "task/ability/shoot"
local KeeperChipAway = Class("Task.KeeperChipAway", require "task/base", Shoot)
local World = require "../base/world"

local CHIP_POS = World.Geometry.OpponentGoal + Vector(0, -0.12)

function KeeperChipAway:_init()
end

function KeeperChipAway:run()
    self:_shoot(CHIP_POS, math.huge, false, 3 * math.pi/180)
end

return KeeperChipAway
