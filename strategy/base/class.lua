--[[
--- Class implementation.
module "Class"
]]--

local Class = {}

local registeredClassNames = {}

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
		return rawget(getmetatable(obj) or {}, "__index")
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
-- @usage local a = new("a")
-- local b = new("b", a)
-- local o = b()
-- instanceOf(o, a) == true
-- instanceOf(o, b) == true
-- local p = a()
-- instanceOf(p, a) == true
-- instanceOf(p, b) == false
-- @param inst table - Instance to check
-- @param class Class - Class object as created by define
-- @see new
-- @return bool
function Class.instanceOf(obj, class)
	local iclass = Class.toClass(obj)
	if iclass == class then
		return true
	else
		local iparent = Class.parent(obj)
		return iparent and Class.instanceOf(iparent, class)
	end
end

--- Creates a new class.
-- Supports single inheritance.
-- @name new
-- @see Class
-- @param name string - name for new class, split at '.'
-- @param parent Class - parent class object
-- @retrun class object
-- @return metatable used for instances
function Class.new(name, parent)
	-- check for unique class names, to prevent naming confusions
	assert(not registeredClassNames[name], "class names must be unique")
	registeredClassNames[name] = true

	local class = {}

	-- setup class type metatable
	local classMt = {
		className = name,
		classNameShort = getShortname(name),
		type = "class"
	}
	classMt.__metatable = classMt
	if parent then
		classMt.__index = Class.toClass(parent)
	end

	-- setup instance metatable
	local classInstMt = {
		__index = class,
		type = "instance"
	}
	classInstMt.__metatable = classInstMt

	function class.create(...)
		local instance = {}
		setmetatable(instance, classInstMt)
		if instance.init then
			instance:init(...)
		end
		return instance
	end
	setmetatable(class, classMt)
	return class, classInstMt
end


local function registerNils(table, key, value)
	if value == nil then
		getmetatable(table).__nilAttributes[key] = true
		return
	end
	rawset(table, key, value)
end

local function forbidNewAttributes(table, key, value)
	if getmetatable(table).__nilAttributes[key] then
		rawset(table, key, value)
	else
		error(table.class.name .. ": attempt to set attribute " .. key)
	end
end

local function forbidReassignments(proxy, key, value)
	local orig = proxy[1]
	if orig[key] ~= nil or getmetatable(orig).__nilAttributes[key] then
		error("attribute " .. key .. " is alredy defined")
	end
	orig[key] = value
end

local proxyMt = { __newindex = forbidReassignments }
local function mixin(self, mixin, ...)
	local proxy = { self }
	setmetatable(proxy, proxyMt)
	for name, field in pairs(mixin) do
        if name == "init" then
            field(proxy, ...)
        else
            proxy[name] = field
        end
    end
end

--- Creates a new class.
-- Supports single inheritance and mixins.
-- @name newTask (for test phase)
-- @see Class
-- @param name string - name for new class, split at '.'
-- @param parent Class - parent class object
-- @return class object
function Class.newTask(name, parent)
	assert(not registeredClassNames[name], "class names must be unique")
	registeredClassNames[name] = true
	local class = {
		fullName = name,
		name = getShortname(name),
		parent = parent
	}
	function class.create(...)
		local instance = {
			class = class,
			mixin = mixin
		}
		local instMt = {
			__nilAttributes = {}, -- remember nil-initialized attributes
			__newindex = registerNils,
			__index = class,
			type = "instance"
		}
		instMt.__metatable = instMt
		setmetatable(instance, instMt)
		if instance.init then
			instance:init(...)
		end
		instMt.__newindex = forbidNewAttributes
		return instance
	end
	local classMt = {
		__call = class.create,
		__index = parent,
		type = "class",
		className = name,
		classNameShort = getShortname(name)
	}
	classMt.__metatable = classMt
	setmetatable(class, classMt)
	return class
end

--- Values set on a class
-- @class table
-- @name Class
-- @field className string - Full name of the class
-- @field classNameShort string - Part of the class name after the last '.'
-- @field instanceOf function - InstanceOf function
-- @field classParent Class - parent class object
-- @field create Function - Creates a new class instance
-- @field init Function - Is called during construction if it exists

return Class
