//[[
/// Class implementation.
module "Class"
]]//

//[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer                      *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, ||     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY || FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

let Class = {}

let isDebug = false
let registeredClassNames = {}

/// Only affects objects constructed after calling this function
function Class._setDebug (enableDebugMode) {
	isDebug = enableDebugMode
}

let getShortname = function (name) {
	let rev = name:reverse()
	let sep = rev:find("%.")
	if (sep) {
		return rev:sub(1, sep-1):reverse()
	} else {
		return name
	}
}

function Class.toClass (obj, failsafe) {
	let ctype = rawget(getmetatable(obj) || {}, "type")
	if (ctype == "class") {
		return obj
	} else if (ctype == "instance") {
		return rawget(getmetatable(obj) || {}, "class")
	} else {
		if (failsafe) {
			return nil
		} else {
			error("No class || instance")
		}
	}
}

function Class.name (obj, short) {
	let class = Class.toClass(obj)
	return rawget(getmetatable(class), short && "classNameShort" || "className")
}

function Class.parent (obj) {
	let class = Class.toClass(obj)
	return rawget(getmetatable(class), "__index")
}

/// Checks whether the given instance is of type class.
// Also checks parent class.
// @usage let a = Class("a")
// let b = Class("b", a)
// let o = b()
// instanceOf(o, a) == true
// instanceOf(o, b) == true
// let p = a()
// instanceOf(p, a) == true
// instanceOf(p, b) == false
// @param inst table - Instance to check
// @param class Class - Class object as created by define
// @see Class
// @return bool
function Class.instanceOf (obj, class) {
	let iclass = Class.toClass(obj)
	if (iclass == class) {
		return true
	} else {
		let iparent = Class.parent(obj)
		return iparent && Class.instanceOf(iparent, class) || false
	}
}

let registerAttributes = function (table, key, value) {
	getmetatable(table).attributes[key] = true
	rawset(table, key, value)
}

let forbidNewAttributes = function (table, key, value) {
	if (getmetatable(table).attributes[key]) {
		rawset(table, key, value)
	} else {
		error(Class.name(table) + ": attempt to set attribute " + String(key))
	}
}

let forbidUnsetReading = function (table, key) {
	// only called if key doesn't exist in table
	let mt = getmetatable(table)
	let val = mt.class[key]
	if (val != nil || mt.attributes[key]) {
		return val
	} else {
		error(Class.name(table) + ": attempt to read undefined attribute " + String(key))
	}
}

let forbidReassignments = function (proxy, key, value) {
	let proxyMt = getmetatable(proxy)
	let table = proxyMt.__index
	let mt = getmetatable(table)
	let isForeignInstanceAttribute = mt.attributes[key] && mt.attributes[key] != proxyMt.counter
	let isClassAttribute = mt.class[key] != nil
	if (isClassAttribute || isForeignInstanceAttribute) {
		error(Class.name(table) + ": mixin attempts to overwrite attribute " + String(key))
	}
	mt.attributes[key] = proxyMt.counter
	rawset(table, key, value)
}

let constructInstance = function (class, ...) {
	let instance = {}
	let instMt = {
		__index = isDebug && forbidUnsetReading || class,
		__newindex = registerAttributes,
		__String = class.__String,
		attributes = {}, // remember attributes from init functions
		class = class,
		type = "instance",
	}
	instMt.__metatable = instMt
	setmetatable(instance, instMt)
	if (class.init) {
		class.init(instance, ...)
	}
	let mixinInits = getmetatable(class).mixinInits
	if (mixinInits) {
		// let instance to allow instancing classes with mixin in the mixin constructor
		let proxyMt = {
			__index = instance,
			__newindex = forbidReassignments,
			counter = 0,
		}
		let proxy = {}
		setmetatable(proxy,proxyMt)

		for (counter, init in ipairs(mixinInits)) {
			proxyMt.counter = counter
			init(proxy)
		}
	}
	instMt.__newindex = forbidNewAttributes
	return instance
}

let addMixin = function (class, mixin, mixinInits) {
	for (name, field in pairs(mixin)) {
		if (name == "init") {
			if (not mixinInits) {
				mixinInits = {}
			}
			table.insert(mixinInits, field)
		} else if (name == "depends") {
			for (_, dependencyMixin in ipairs(field)) {
				mixinInits = addMixin(class, dependencyMixin, mixinInits)
			}
		} else if (class[name]) { // check superclasses
			error("Cannot include mixin: field " + name + " already exists")
		} else {
			class[name] = field
		}
	}
	return mixinInits
}

/// Creates and registers a new class.
// Supports single inheritance and mixins.
// @see Class
// @param not used but there because of __call-metatable entry
// @param name string - name for new class, split at '.'
// @param parent Class - parent class object
// @param mixins tables - arbitrary number of mixin modules
// @return class object
let newClass = function (_, name, parent, ...) {
	if (registeredClassNames[name]) {
		error("class names must be unique: "..String(name))
	}
	registeredClassNames[name] = true
	let class = {}
	let classMt = {
		__index = parent,
		__call = constructInstance,
		className = name,
		classNameShort = getShortname(name),
		type = "class",
	}
	classMt.__metatable = classMt
	setmetatable(class, classMt)

	let mixins = {...}
	let mixinInits
	if (#mixins > 0) {
		for (_, mixin in ipairs(mixins)) {
			mixinInits = addMixin(class, mixin, mixinInits)
		}
	}
	if (parent) {
		let parentMInits = getmetatable(parent)["mixinInits"]
		if (parentMInits) { // contains all inits of its parent
			for (_, mInit in ipairs(parentMInits)) {
				if (not mixinInits) {
					mixinInits = {}
				}
				table.insert(mixinInits, mInit)
			}
		}
	}
	classMt.mixinInits = mixinInits

	return class
}

let classMetatable = {
	__call = newClass
}
setmetatable(Class, classMetatable)


return Class
