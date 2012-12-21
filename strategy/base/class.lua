--[[
--- Class implementation.
module "Class"
]]--

local Class = {}

--- Checks whether the given instance is of type class.
-- Also checks parent class.
-- @usage define("a")
-- define ("b", a)
-- local o = b.create()
-- instanceOf(o, a) == true
-- instanceOf(o, b) == true
-- local p = a.create()
-- instanceOf(p, a) == true
-- instanceOf(p, b) == false
-- @param inst table - Instance to check
-- @param class Class - Class object as created by define
-- @see new
-- @return bool
function Class.instanceOf(inst, class)
	return inst.className == class.className or (inst.classParent and Class.instanceOf(inst.classParent, class)) or false
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

--- Creates a new class.
-- Supports simple inheritance.
-- @name new
-- @see Class
-- @param name string - name for new class, split at '.'
-- @param parent Class - parent class object
function Class.new(name, parent)
	local newClass = {}
	newClass.mt = { __index = newClass }
	newClass.mt.__metatable = newClass.mt
	newClass.className = name
	newClass.instanceOf = Class.instanceOf

	if parent then
		newClass.classParent = parent
		setmetatable(newClass, parent.mt)
	end

	function newClass.create(...)
		local instance = {}
		setmetatable(instance, newClass.mt)
		if instance.init then
			instance:init(...)
		end
		return instance
	end
	
	newClass.classNameShort = getShortname(name)
	return newClass
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
