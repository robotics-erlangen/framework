--[[
--- Class implementation.
module "Class"
]]--

--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer                      *
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

local Class = {}

local isDebug = false
local registeredClassNames = {}

--- Only affects objects constructed after calling this function
function Class._setDebug(enableDebugMode)
	isDebug = enableDebugMode
end

local function getShortname(name)
	local rev = name:reverse()
	local sep = rev:find("%.")
	if sep then
		return rev:sub(1, sep-1):reverse()
	else
		return name
	end
end

function Class.toClass(obj, failsafe)
	local ctype = rawget(getmetatable(obj) or {}, "type")
	if ctype == "class" then
		return obj
	elseif ctype == "instance" then
		return rawget(getmetatable(obj) or {}, "class")
	else
		if failsafe then
			return nil
		else
			error("No class or instance")
		end
	end
end

function Class.name(obj, short)
	local class = Class.toClass(obj)
	return rawget(getmetatable(class), short and "classNameShort" or "className")
end

function Class.parent(obj)
	local class = Class.toClass(obj)
	return rawget(getmetatable(class), "__index")
end

--- Checks whether the given instance is of type class.
-- Also checks parent class.
-- @usage local a = Class("a")
-- local b = Class("b", a)
-- local o = b()
-- instanceOf(o, a) == true
-- instanceOf(o, b) == true
-- local p = a()
-- instanceOf(p, a) == true
-- instanceOf(p, b) == false
-- @param inst table - Instance to check
-- @param class Class - Class object as created by define
-- @see Class
-- @return bool
function Class.instanceOf(obj, class)
	local iclass = Class.toClass(obj)
	if iclass == class then
		return true
	else
		local iparent = Class.parent(obj)
		return iparent and Class.instanceOf(iparent, class) or false
	end
end

local function registerAttributes(table, key, value)
	getmetatable(table).attributes[key] = true
	rawset(table, key, value)
end

local function forbidNewAttributes(table, key, value)
	if getmetatable(table).attributes[key] then
		rawset(table, key, value)
	else
		error(Class.name(table) .. ": attempt to set attribute " .. tostring(key))
	end
end

local function forbidUnsetReading(table, key)
	-- only called if key doesn't exist in table
	local mt = getmetatable(table)
	local val = mt.class[key]
	if val ~= nil or mt.attributes[key] then
		return val
	else
		error(Class.name(table) .. ": attempt to read undefined attribute " .. tostring(key))
	end
end

local function forbidReassignments(proxy, key, value)
	local proxyMt = getmetatable(proxy)
	local table = proxyMt.__index
	local mt = getmetatable(table)
	local isForeignInstanceAttribute = mt.attributes[key] and mt.attributes[key] ~= proxyMt.counter
	local isClassAttribute = mt.class[key] ~= nil
	if isClassAttribute or isForeignInstanceAttribute then
		error(Class.name(table) .. ": mixin attempts to overwrite attribute " .. tostring(key))
	end
	mt.attributes[key] = proxyMt.counter
	rawset(table, key, value)
end

local function constructInstance(class, ...)
	local instance = {}
	local instMt = {
		__index = isDebug and forbidUnsetReading or class,
		__newindex = registerAttributes,
		__tostring = class.__tostring,
		attributes = {}, -- remember attributes from init functions
		class = class,
		type = "instance",
	}
	instMt.__metatable = instMt
	setmetatable(instance, instMt)
	if class.init then
		class.init(instance, ...)
	end
	local mixinInits = getmetatable(class).mixinInits
	if mixinInits then
		-- local instance to allow instancing classes with mixin in the mixin constructor
		local proxyMt = {
			__index = instance,
			__newindex = forbidReassignments,
			counter = 0,
		}
		local proxy = {}
		setmetatable(proxy,proxyMt)

		for counter, init in ipairs(mixinInits) do
			proxyMt.counter = counter
			init(proxy)
		end
	end
	instMt.__newindex = forbidNewAttributes
	return instance
end

local function addMixin(class, mixin, mixinInits)
	for name, field in pairs(mixin) do
		if name == "init" then
			if not mixinInits then
				mixinInits = {}
			end
			table.insert(mixinInits, field)
		elseif name == "depends" then
			for _, dependencyMixin in ipairs(field) do
				mixinInits = addMixin(class, dependencyMixin, mixinInits)
			end
		elseif class[name] then -- check superclasses
			error("Cannot include mixin: field " .. name .. " already exists")
		else
			class[name] = field
		end
	end
	return mixinInits
end

--- Creates and registers a new class.
-- Supports single inheritance and mixins.
-- @see Class
-- @param not used but there because of __call-metatable entry
-- @param name string - name for new class, split at '.'
-- @param parent Class - parent class object
-- @param mixins tables - arbitrary number of mixin modules
-- @return class object
local function newClass(_, name, parent, ...)
	if registeredClassNames[name] then
		error("class names must be unique: "..tostring(name))
	end
	registeredClassNames[name] = true
	local class = {}
	local classMt = {
		__index = parent,
		__call = constructInstance,
		className = name,
		classNameShort = getShortname(name),
		type = "class",
	}
	classMt.__metatable = classMt
	setmetatable(class, classMt)

	local mixins = {...}
	local mixinInits
	if #mixins > 0 then
		for _, mixin in ipairs(mixins) do
			mixinInits = addMixin(class, mixin, mixinInits)
		end
	end
	if parent then
		local parentMInits = getmetatable(parent)["mixinInits"]
		if parentMInits then -- contains all inits of its parent
			for _, mInit in ipairs(parentMInits) do
				if not mixinInits then
					mixinInits = {}
				end
				table.insert(mixinInits, mInit)
			end
		end
	end
	classMt.mixinInits = mixinInits

	return class
end

local classMetatable = {
	__call = newClass
}
setmetatable(Class, classMetatable)


return Class
