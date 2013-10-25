--[[
--- Loads global modules. Also takes care of initializing the random number generator. <br/>
-- General informations: <br/>
-- The coordinate systems y-direction points towards the opponent goal. <br/>
-- The x-direction points from the left to the right border. <br/>
-- It is centered on the kickoff point. <br/>
-- Angles are oriented counter-clockwise, 0 points in positive x-direction. <br/>
-- Angles are measured in radians. <br/>
-- All lengths are unless specified otherwise denoted in meters.
-- Speed in m/s and acceleration in m/s^2.
module "base"
]]--
require "../base/amun"
require "../base/path"
require "../base/math"
require "../base/table"
require "../base/vector"
require "../base/userinput"

math.randomseed(amun.getCurrentTime()) -- init rng

-- preload classes that require access to the amun API
local Coordinates = require "../base/coordinates"
local Robot = require "../base/robot"
local World = require "../base/world"
local debug = require "../base/debug"
local plot = require "../base/plot"
local vis = require "../base/vis"

-- prevent access to internal APIs
amun._hideFunctions()
