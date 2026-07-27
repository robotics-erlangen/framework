--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
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

local Injector = require "test/unit/injector"

context("base.class", function()
	local Class, Super

	before(function()
		Class = Injector.newClassLoader()

		Super = Class("Super")
		Super.superClassAttribute = false
		function Super:run() end
		function Super:init()
			self.superInstanceAttribute = nil
		end
	end)

	test("class instance separation", function()
		-- check for basic class / instance semantic
		local Base = Class("ClassIS")
		Base.classAttribute = 14
		Base.falseClassAttribute = false
		function Base:init()
			-- class attributes must be visible
			assert_equal(self.classAttribute, 14)
			assert_false(self.falseClassAttribute)

			-- instance attributes must not leak into the class
			self.instanceAttribute = 42
			assert_equal(self.instanceAttribute, 42)
		end

		local instance = Base()
		assert_equal(instance.classAttribute, 14)
		assert_false(instance.falseClassAttribute)
		assert_equal(instance.instanceAttribute, 42)
		assert_nil(Base.instanceAttribute)

		-- Updated class attributes leak into the instance
		Base.classAttribute = 42
		assert_equal(Base.classAttribute, 42)
		assert_equal(instance.classAttribute, 42)
	end)

	test("class constructor parameter", function()
		local paramValue = { "param" }
		local Base = Class("ClassCP")
		function Base:init(param, noParam)
			-- check parameter forwarding
			assert_equal(param, paramValue)
			assert_nil(noParam)
		end
		Base(paramValue)
	end)

	test("class constructor parameter gap", function()
		local paramValue = { "param" }
		local Base = Class("ClassCP")
		function Base:init(param, noParam, gapped)
			-- check parameter forwarding
			assert_equal(param, paramValue)
			assert_nil(noParam)
			assert_equal(gapped, "foobar")
		end
		Base(paramValue,nil,"foobar")
	end)

	test("class attribute override", function()
		local Base = Class("ClassAO")
		Base.overrideAttribute = "class"
		function Base:init()
			-- overriding class attributes redefines them only for this instance
			assert_equal(self.overrideAttribute, "class")
			self.overrideAttribute = "instance"
			assert_equal(self.overrideAttribute, "instance")
		end

		local instance = Base()
		assert_equal(instance.overrideAttribute, "instance")
		assert_equal(Base.overrideAttribute, "class")

		-- Updated class attributes leak into the instance unless shadowed by it
		Base.overrideAttribute = "replaced"
		assert_equal(Base.overrideAttribute, "replaced")
		assert_equal(instance.overrideAttribute, "instance")
	end)

	test("unique class names", function()
		-- define class Unique
		Class("Unique")
		assert_error(function() Class("Unique") end,
				"Class names must be unique")
	end)

	test("get class name", function()
		local Test = Class("Test.Class")
		assert_equal(Class.name(Test), "Test.Class")
		assert_equal(Class.name(Test, true), "Class")

		local instance = Test()
		assert_equal(Class.name(instance), "Test.Class")
		assert_equal(Class.name(instance, true), "Class")
	end)

	test("object to class", function()
		local instance = Super()
		assert_equal(Class.toClass(Super), Super)
		assert_equal(Class.toClass(instance), Super)
		-- error handling for non class things
		assert_nil(Class.toClass(true, true), nil)
		assert_error(function() Class.toClass(true) end)
	end)

	test("class inheritance", function()
		local Middle = Class("MiddleCI", Super)
		Middle.classAttribute = false
		function Middle:init()
			-- attributes of super classes are immediatelly available
			assert_false(self.superClassAttribute)
			-- instance attributes only after calling the constructor
			Super.init(self)
			assert_nil(self.superInstanceAttribute)
			-- own attributes
			assert_false(self.classAttribute)
			self.instanceAttribute = "middle"
			assert_equal(self.instanceAttribute, "middle")
		end

		local Child = Class("ChildCI", Middle)
		function Child:init()
			-- instance attributes only after calling the constructor
			Middle.init(self)

			assert_false(self.superClassAttribute)
			assert_nil(self.superInstanceAttribute)
			assert_false(self.classAttribute)
			assert_equal(self.instanceAttribute, "middle")
		end

		local instance = Child()
		-- check for inherited attributes
		assert_false(instance.superClassAttribute)
		assert_nil(instance.superInstanceAttribute)
		assert_false(instance.classAttribute)
		assert_equal(instance.instanceAttribute, "middle")

		-- Updated class attributes leak into the instance
		Middle.classAttribute = "replaced"
		assert_nil(Super.classAttribute)
		assert_equal(Middle.classAttribute, "replaced")
		assert_equal(Child.classAttribute, "replaced")
		assert_equal(instance.classAttribute, "replaced")

	end)

	test("class attribute override with inheritance", function()
		local Middle = Class("MiddleAOI", Super)
		Middle.overrideAttribute = "middle"

		local Child = Class("ChildAOI", Middle)
		function Child:init()
			assert_equal(self.overrideAttribute, "middle")
			self.overrideAttribute = "instance"
			assert_equal(self.overrideAttribute, "instance")
		end
		function Child:writeOverride()
			self.overrideAttribute = "mine"
		end
		function Child:writeClassAttribute()
			self.superClassAttribute = 42
		end

		local instance = Child()
		assert_nil(Super.overrideAttribute)
		assert_equal(Middle.overrideAttribute, "middle")
		assert_equal(Child.overrideAttribute, "middle")
		assert_equal(instance.overrideAttribute, "instance")

		-- Updated class attributes leak into the instance unless shadowed by it
		Middle.overrideAttribute = "replaced"
		assert_nil(Super.overrideAttribute)
		assert_equal(Middle.overrideAttribute, "replaced")
		assert_equal(Child.overrideAttribute, "replaced")
		assert_equal(instance.overrideAttribute, "instance")

		-- only allow overwriting class attributes if they were shadowed by the constructor
		assert_error(function() instance:writeClassAttribute() end,
				"overwriting an class attribute outside the constructor must fail")
		assert_not_error(function() instance:writeOverride() end,
				"writing an overwriten class attribute must succeed")
	end)

	test("class parent", function()
		local Middle = Class("MiddleP", Super)
		local Child = Class("ChildP", Middle)

		assert_equal(Class.parent(Child), Middle)
		assert_equal(Class.parent(Middle), Super)
		assert_nil(Class.parent(Super))

		local superInstance = Super()
		local middleInstance = Middle()
		local childInstance = Child()

		assert_equal(Class.parent(childInstance), Middle)
		assert_equal(Class.parent(middleInstance), Super)
		assert_nil(Class.parent(superInstance))
	end)

	test("class instance of", function()
		local Middle = Class("MiddleIO", Super)
		local Child = Class("ChildIO", Middle)

		local superInstance = Super()
		local middleInstance = Middle()
		local childInstance = Child()

		assert_true(Class.instanceOf(childInstance, Super))
		assert_true(Class.instanceOf(middleInstance, Super))
		assert_true(Class.instanceOf(superInstance, Super))

		assert_true(Class.instanceOf(childInstance, Middle))
		assert_true(Class.instanceOf(middleInstance, Middle))
		assert_false(Class.instanceOf(superInstance, Middle))

		assert_true(Class.instanceOf(childInstance, Child))
		assert_false(Class.instanceOf(middleInstance, Child))
		assert_false(Class.instanceOf(superInstance, Child))
	end)

	test("writing undefined attributes", function()
		local Writer = Class("Writer", Super)
		function Writer:init()
			self.isNil = nil
			self.otherValue = 42
		end
		function Writer:writeUndefined()
			self.undefined = true
		end
		function Writer:writeDefined()
			-- check for correct nil and false handling
			self.isNil = nil
			self.isNil = false
			self.isNil = true
			self.otherValue = self.otherValue + 1
		end
		local instance = Writer()
		assert_error(function() instance:writeUndefined() end,
				"writing an undefined attribute shall fail")
		assert_not_error(function() instance:writeDefined() end,
				"overwriting an attribute with old value of nil or false must succeed")
	end)

	test("reading undefined attributes", function()
		local Reader = Class("Reader", Super)
		function Reader:init()
			Super.init(self)
			self.instanceAttribute = nil
		end
		function Reader:readUndefined()
			return self._blub
		end
		Reader.notTrue = false
		function Reader:readClassFalse()
			return self.notTrue or self.superClassAttribute
		end
		function Reader:readNilAttributes()
			return self.instanceAttribute or self.superInstanceAttribute
		end

		local instance = Reader()
		assert_error(function() instance:readUndefined() end,
				"reading an undefined variable shall fail")
		assert_not_error(function() instance:readClassFalse() end,
				"reading class attributes with value false must succeed")
		assert_not_error(function() instance:readNilAttributes() end,
				"reading attributes with value nil must succeed")
	end)

	test("class tostring", function()
		local Middle = Class("ClassTS", Super)
		function Middle:__tostring()
			return "middle"
		end

		local instance = Middle()
		assert_equal(tostring(instance), "middle",
				"Custom tostring method missing")

		local Child = Class("ChildTS", Middle)
		local childInstance = Child()
		assert_equal(tostring(childInstance), "middle",
				"tostring method not inherited")
	end)

	test("mixin method collision", function()
		local M1 = {}
		function M1:run() end
		assert_error(function() Class("MiddleFail", Super, M1) end,
				"including a mixin which would overwrite a superclass method/class attribute shall fail")
	end)

	test("mixin init params", function()
		local Mixin = {}
		function Mixin:init(noParam)
			-- mixin init gets no parameters
			assert_nil(noParam)
			self.executed = true
		end
		local instance = Class("MixinIP", Super, Mixin)("param")
		assert_true(instance.executed)
	end)

	test("mixin init read own attributes", function()
		local Mixin = {}
		Mixin.mixinAttribute = "value"
		function Mixin:init()
			self.mixinValue = 3
			assert_equal(self.mixinValue, 3)
			assert_equal(self.mixinAttribute, "value")
		end
		local instance = Class("MixinRI", Super, Mixin)()
		assert_equal(instance.mixinValue, 3)
		assert_equal(instance.mixinAttribute, "value")
	end)

	test("mixin init override own attributes", function()
		local Mixin = {}
		function Mixin:init()
			self.mixinValue = nil
			self.mixinValue = 3
			self.mixinValue = 2
		end
		local inst = Class("MixinOI", Super, Mixin)()
		assert_equal(inst.mixinValue, 2)
	end)

	test("mixin read superclass attributes", function()
		local Mixin = {}
		function Mixin:init()
			assert_false(self.superClassAttribute)
			assert_nil(self.superInstanceAttribute)
		end
		function Mixin:read()
			Mixin.init(self)
		end
		assert_not_error(function()
			local instance = Class("MixinRSA", Super, Mixin)()
			instance:read()
		end, "Mixin must be able to read super class attributes")
	end)

	test("mixin attribute collision", function()
		local M2 = {}
		function M2:init()
			self.instanceAttribute = "mixin"
		end
		local Middle = Class("Middle", Super, M2)
		function Middle:init()
			self.instanceAttribute = "instance"
		end
		assert_error(function() Middle() end,
				"a mixin shall not be able to shadow a instance attribute")
	end)

	test("mixin class attribute collision", function()
		local M2 = {}
		function M2:init()
			self.classAttribute = "mixin"
		end
		local Middle = Class("MiddleCAC", Super, M2)
		Middle.classAttribute = "class"
		assert_error(function() Middle() end,
				"a mixin shall not be able to shadow a class attribute")
		assert_equal(Middle.classAttribute, "class")
	end)

	test("attribute collision between two mixins", function()
		local M3 = {}
		function M3:init()
			self.mixinAttribute = 0
		end
		local M4 = {}
		function M4:init()
			self.mixinAttribute = 1
		end
		local Middle = Class("Middle2M", Super, M3, M4)
		assert_error(function() Middle() end,
				"two mixins shall not be able to define the same attribute")
	end)

	test("two mixin init", function()
		local M3 = {}
		function M3:init()
			self.mixin1Attribute = 0
		end
		local M4 = {}
		function M4:init()
			self.mixin2Attribute = 1
		end
		local Middle = Class("Middle2MI", Super, M3, M4)
		local instance = Middle()
		assert_equal(instance.mixin1Attribute, 0)
		assert_equal(instance.mixin2Attribute, 1)
	end)

	test("mixin write undefined attributes", function()
		local M3 = {}
		function M3:writeUndefined()
			self.someNewVar = 2
		end

		local Middle = Class("MixinWU", nil, M3)
		local instance = Middle()
		assert_error(function() instance:writeUndefined() end,
				"a mixin shall not be able to define new attributes in normal methods")
	end)

	test("mixin reading undefined attributes", function()
		local Mixin = {}
		-- luacheck: ignore tmp
		function Mixin:init()
			local tmp = self.undefined
		end
		local Reader = Class("MixinReader", Super, Mixin)
		assert_error(function() Reader() end,
				"reading an undefined variable in a mixin shall fail")
	end)

	test("mixin inheritance", function()
		local M3 = {}
		M3.mixinClassAttribute = "class"
		function M3:init()
			self.mixinInstanceAttribute = 4
		end

		local Middle = Class("MixinIM", nil, M3)
		local Child = Class("MixinIC", Middle)
		local instance = Child()
		assert_equal(instance.mixinClassAttribute, "class")
		assert_equal(instance.mixinInstanceAttribute, 4)
	end)

	test("mixin dependency", function()
		local M4 = {}
		function M4:init()
			self.mixinAttribute = 4
		end
		local M3 = {}
		M3.depends = { M4 }

		local Middle = Class("MixinD", nil, M3)
		local instance = Middle()
		assert_equal(instance.mixinAttribute, 4, "mixin dependency not resolved")
	end)

	test("mixin init reentrancy", function()
		-- Check that the proxy object can handle nested initializations
		local M3 = {}
		function M3:init()
			self.mixinAttribute = 4
		end
		local Outer = Class("MixinOuter", nil, M3)

		local M4 = {}
		function M4:init()
			self.outer = Outer()
			self.mixinAttribute = 3
		end
		local Inner = Class("MixinInner", nil, M4)

		local instance = Inner()
		assert_not_error(function()
			assert_equal(instance.outer.mixinAttribute, 4)
			assert_equal(instance.mixinAttribute, 3)
		end, "mixinAttribute written on wrong object")
	end)
end)
