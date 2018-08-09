local Injector = {}

local InjectorMt = {
	__index = Injector
}

//- Create a new Injector instance.
// The globals and modules available by default are those for Class and Vector
// Both don't perform any IO and with the exception of the class name registry
// use no shared state. amun and log on the other hand both perform IO and thus
// are NOT available by default.
// Some of the builtin lua functions are also made available. See injectSafeBuiltins
// for details. The selection intends to "sandbox" the loaded module. Any IO /
// code loading / global modification functions are not exported by default.
// These can be made available explicitly. The sandboxed module can, however,
// tamper with any global / module overlay it receives.
// @param classLoader - Class instance to use for the Class globals/modules
// @param excludeDefault - set to true to not load the Vector globals/modules
function Injector:init(classLoader, excludeVector)
	local instance = {
		_globals = {},
		_modules = {},
	}
	setmetatable(instance, InjectorMt)

	instance:_addDefaultOverlay("../base/class", "Class", classLoader)
	if not excludeVector then
		instance:_addDefaultOverlay("../base/vector", "Vector", require "../base/vector")
	end
	return instance
end

function Injector.newClassLoader()
	local injector = Injector()
	local Class = injector:load("../base/class")
	Class._setDebug(true)
	return Class
end

function Injector:_addDefaultOverlay(moduleName, variableName, module)
	self:addModuleOverlay(moduleName, module)
	self:addGlobalOverlay(variableName, module)
end

function Injector:addModuleOverlay(moduleName, module)
	self._modules[moduleName] = module
end

function Injector:addGlobalOverlay(variableName, value)
	assert(variableName ~= "require", "require is a reserved global")
	self._globals[variableName] = value
end

function Injector:load(newModuleName)
	if self._modules[newModuleName] ~= nil then
		error("Module " .. newModuleName .. " already loaded in this injector instance!")
	end
	local errors = {}

	for i, loader in ipairs(package.loaders) do
		local isPreloadLoader = (i == 1)
		if not isPreloadLoader then
			local result = loader(newModuleName)
			if type(result) == "function" then
				self:_injectEnvironment(result)
				local loadedModule = result()
				self:addModuleOverlay(newModuleName, loadedModule)
				return loadedModule
			else
				table.insert(errors, result)
			end
		end
	end

	error(string.format("Failed to load module %s: ", newModuleName) .. table.concat(errors, ", "))
end

local function copyTable(source)
	local copy = {}
	for key, value in pairs(source) do
		copy[key] = value
	end
	return copy
end

local function injectSafeBuiltins(env)
	// Don't forward builtins that could cause potentially unintended side effects
	// If these are intended the builtins can be exported explicitly using
	// addGlobalOverlay. The remaining builtins can still be used to tamper with
	// any global or module overlay!
	// code loading: "dofile", "load", "loadfile", "loadstring", "module",
	//     "package", "require" (require is replaced with custom loader)
	// IO: "print", "io", "file", "os"
	// global gc configuration: "collectgarbage" (global gc configuration, DoS)
	// low level debugging: "debug" (could tamper with external state)
	// globals isolation: "getfenv", "setfenv" (could tamper with external functions)
	// global control flow: "coroutine" (could yield if currently in a coroutine)
	local builtinList = {
		"_VERSION", "assert", "error", "getmetatable", "ipairs", "next",
		"pairs", "pcall", "rawequal", "rawget", "rawset", "select",
		"setmetatable", "tonumber", "tostring", "type", "unpack", "xpcall"
	}
	local builtinTables = {
		"math", "string", "table"
	}

	for _, builtin in ipairs(builtinList) do
		env[builtin] = _G[builtin]
	end
	for _, builtin in ipairs(builtinTables) do
		if _G[builtin] then
			env[builtin] = copyTable(_G[builtin])
		end
	end
	// prevent killing the RNG seed
	env.math.randomseed = nil
end

function Injector:_injectEnvironment(func)
	local env = copyTable(self._globals)
	local modules = copyTable(self._modules)

	injectSafeBuiltins(env)
	env._G = env
	env.require = function(name)
		if modules[name] then
			return modules[name]
		end
		error(string.format("Module %s has no injected replacement!", name))
	end
	setfenv(func, env)
end


local InjectorClassMt = {
	__call = Injector.init
}
setmetatable(Injector, InjectorClassMt)

return Injector
