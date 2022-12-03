--[[
--- Eigen module provided by Ra. <br/>
module "eigen"
]]--

--[[***********************************************************************
*   Copyright 2022 Tobias Heineken                                        *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

require "eigen"
-- luacheck: globals eigen
local eigen = eigen

-- kill all references
_G["eigen"] = nil
package.preload["eigen"] = nil
package.loaded["eigen"] = nil

local instance_mt = {};
local function_table = {};

local function proxy_index(table, key)
	local mt = getmetatable(table)
	local userdata = mt.table
	local x = mt.key
	local y = key
	return eigen.getmatrix(userdata, x, y)
end

local function proxy_newindex(table, key, value)
	local mt = getmetatable(table)
	local userdata = mt.table
	local x = mt.key
	local y = key
	eigen.setmatrix(userdata, x, y, value)
end

local function getUserdata(proxy)
	return proxy.ud
end

local function setUserdata(proxy, userdata)
	proxy.ud = userdata
end

function instance_mt.__index(table, key)
	if type(key) == "string" then
		-- We want to look for a function
		return function_table[key]
	elseif type(key) == "number" then
		-- We want to create a proxy for that key and that table
		local proxy = {}
		local proxy_mt = {}
		proxy_mt.key = key
		proxy_mt.table = getUserdata(table)
	proxy_mt.__newindex = proxy_newindex
		proxy_mt.__index = proxy_index
		setmetatable(proxy, proxy_mt)
		return proxy
	end
end

local function wrap_UD(userdata)
	local proxy = {};
	setUserdata(proxy, userdata)
	setmetatable(proxy, instance_mt)
	return proxy
end

function instance_mt.__mul(lhs, rhs)
	local userdataLeft = getUserdata(lhs)
	local userdataRigt = getUserdata(rhs)
	local res = eigen.matrix_multiplication(userdataLeft, userdataRigt)
	return wrap_UD(res)
end

function instance_mt.__tostring(obj)
	local res = "{"
	local row, col = obj:size()
	local outSep = ""
	for i=1, row do
		res = res .. outSep .. "{"
		outSep = ", "
		local sep = ""
		for j=1, col do
			res = res .. sep .. tostring(obj[i][j])
			sep = ", "
		end
		res = res .. "}"
	end
	return res .. "}"
end

function function_table.size(proxy)
	return eigen.getsize(getUserdata(proxy))
end

function function_table.transposed(proxy)
	return wrap_UD(eigen.transposed(getUserdata(proxy)))
end

function function_table.solve(proxy, other_proxy)
	local lhs = getUserdata(proxy)
	local rhs = getUserdata(other_proxy)
	local resultUD = eigen.solve(lhs, rhs)
	return wrap_UD(resultUD)
end

instance_mt.__newindex = error


local ret = {}
local ret_mt = {}
function ret_mt.__call(_, x, y)
	return wrap_UD(eigen.createMatrix(x, y))
end

ret_mt.__index = error
ret_mt.__newindex = error

setmetatable(ret, ret_mt)
return ret
