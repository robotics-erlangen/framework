--[[
--- Send plot data to ra
module "plot"
]]--
local plot = {}
local amun = amun

--- Add data to a plot. Value is used to create a point at the current time
-- @name addPlot
-- @param name string - Plot name, seperated layers by '.'
-- @param value number - value for data point
function plot.addPlot(name, value)
	amun.addPlot(name, value)
end

return plot
