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

--- Creates a new matrix
-- @class function
-- @name Eigen:()
-- @param x number - the number of rows for the matrix
-- @param y number - the number of cols for the matrix
-- @return matrix - the newly created matrix, all fields have unspecified values

--[[
separator for luadoc]]--

--- Gets the dimesions for a given matrix
-- @class function
-- @name matrix::size
-- @param self matrix - the matrix to work on
-- @return r, c - the rows (r) and columns (c) of the given matrix

--[[
separator for luadoc]]--

--- Creates the transposed matrix
-- @class function
-- @name matrix::transposed
-- @param self matrix - the matrix to work on
-- @return matrix - the newly created transposed matrix of self


--[[
separator for luadoc]]--


--- Calulate x so that self * x = rhs
-- Self needs to be either positive semidefinite or negative semidefinite
-- to allow to call this function correctly
-- No diagnostics are required if self is not either kind of semidifinite
-- Using Eigen::ldlt (see https://eigen.tuxfamily.org/dox/group__TutorialLinearAlgebra.html)
-- @class function
-- @name matrix::solve
-- @param self matrix - the matrix to work on
-- @param rhs matrix - the right hand side matrix
-- @return matrix - the newly created matrix that solves self * x = rhs

--[[
separator for luadoc]]--

--- create a string-represenation for the matrix
-- @class function
-- @name tostring(matrix)
-- @param self matrix - the matrix to display
-- @return string - the text represenation of self


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
