let Injector = {}

let InjectorMt = {
	__index = Injector
}

/// Create a new Injector instance.
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
function Injector:init (classLoader, excludeVector) {
	let instance = {
		_globals = {},
		_modules = {},
	}
	setmetatable(instance, InjectorMt)

	instance:_addDefaultOverlay("+/base/class", "Class", classLoader)
	if (not excludeVector) {
		instance:_addDefaultOverlay("+/base/vector", "Vector", require "+/base/vector")
	}
	return instance
}

function Injector.newClassLoader () {
	let injector = Injector()
	let Class = injector.load("+/base/class")
	Class._setDebug(true)
	return Class
}

function Injector:_addDefaultOverlay (moduleName, variableName, module) {
	this.addModuleOverlay(moduleName, module)
	this.addGlobalOverlay(variableName, module)
}

function Injector:addModuleOverlay (moduleName, module) {
	this._modules[moduleName] = module
}

function Injector:addGlobalOverlay (variableName, value) {
	assert(variableName != "require", "require is a reserved global")
	this._globals[variableName] = value
}

function Injector:load (newModuleName) {
	if (this._modules[newModuleName] != undefined) {
		error("Module "  +  newModuleName  +  " already loaded in this injector instance!")
	}
	let errors = {}

	for (i, loader in ipairs(package.loaders)) {
		let isPreloadLoader = (i == 1)
		if (not isPreloadLoader) {
			let result = loader(newModuleName)
			if (type(result) == "function") {
				this._injectEnvironment(result)
				let loadedModule = result()
				this.addModuleOverlay(newModuleName, loadedModule)
				return loadedModule
			} else {
				table.insert(errors, result)
			}
		}
	}

	error(string.format("Failed to load module %s: ", newModuleName)  +  table.concat(errors, ", "))
}

let copyTable = function (source) {
	let copy = {}
	for (key, value in pairs(source)) {
		copy[key] = value
	}
	return copy
}

let injectSafeBuiltins = function (env) {
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
	let builtinList = {
		"_VERSION", "assert", "error", "getmetatable", "ipairs", "next",
		"pairs", "pcall", "rawequal", "rawget", "rawset", "select",
		"setmetatable", "tonumber", "tostring", "type", "unpack", "xpcall"
	}
	let builtinTables = {
		"math", "string", "table"
	}

	for (_, builtin in ipairs(builtinList)) {
		env[builtin] = _G[builtin]
	}
	for (_, builtin in ipairs(builtinTables)) {
		if (_G[builtin]) {
			env[builtin] = copyTable(_G[builtin])
		}
	}
	// prevent killing the RNG seed
	env.Math.randomseed = nil
}

function Injector:_injectEnvironment (func) {
	let env = copyTable(this._globals)
	let modules = copyTable(this._modules)

	injectSafeBuiltins(env)
	env._G = env
	env.require = function(name)
		if (modules[name]) {
			return modules[name]
		}
		error(string.format("Module %s has no injected replacement!", name))
	}
	setfenv(func, env)
}


let InjectorClassMt = {
	__call = Injector.init
}
setmetatable(Injector, InjectorClassMt)

return Injector
