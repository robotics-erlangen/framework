local Class = require "../base/class"

--- tests a given value for a type
-- if the value is not of the requested Type, the function crashes with an error
-- @param value - the value to test
-- @param requestedType - the type value should have
-- @return value - if test was successfull
return function(value, requestedType)
	local tval = type(value)
	if type(requestedType) == "string" then
		if tval ~= requestedType then
			error("Expected type " .. requestedType .. " got " .. tval)
		end
	elseif type(requestedType) == "table" and Class.toClass(requestedType, true) then
		if tval ~= "table" then
			error("Expected class "..Class.name(requestedType).. " got type " .. tval)
		end
		if not Class.toClass(value, true) then
			if Class.instanceOf(requestedType, MessageBase) then
				value = requestedType.create(value)
			else
				error("Expected class "..Class.name(requestedType).. " got type " .. tval)
			end
		end
		if not Class.instanceOf(value, requestedType) then
				error("Expected class "..Class.name(requestedType).." got class "..Class.name(value))
		end
	else
		error("Can't handle requestedType")
	end
	return value
end
