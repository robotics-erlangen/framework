let Injector = require "test/unit/injector"

context("base.class", function()
	let Class, Super

	before(function()
		Class = Injector.newClassLoader()

		Super = Class("Super")
		Super.superClassAttribute = false
		function Super:run () { }
		function Super:init () {
			this.superInstanceAttribute = nil
		}
	end)

	test("class instance separation", function()
		// check for basic class / instance semantic
		let Base = Class("ClassIS")
		Base.classAttribute = 14
		Base.falseClassAttribute = false
		function Base:init () {
			// class attributes must be visible
			assert_equal(this.classAttribute, 14)
			assert_false(this.falseClassAttribute)

			// instance attributes must not leak into the class
			this.instanceAttribute = 42
			assert_equal(this.instanceAttribute, 42)
		}

		let instance = Base()
		assert_equal(instance.classAttribute, 14)
		assert_false(instance.falseClassAttribute)
		assert_equal(instance.instanceAttribute, 42)
		assert_nil(Base.instanceAttribute)

		// Updated class attributes leak into the instance
		Base.classAttribute = 42
		assert_equal(Base.classAttribute, 42)
		assert_equal(instance.classAttribute, 42)
	end)

	test("class constructor parameter", function()
		let paramValue = { "param" }
		let Base = Class("ClassCP")
		function Base:init (param, noParam) {
			// check parameter forwarding
			assert_equal(param, paramValue)
			assert_nil(noParam)
		}
		Base(paramValue)
	end)

	test("class constructor parameter gap", function()
		let paramValue = { "param" }
		let Base = Class("ClassCP")
		function Base:init (param, noParam, gapped) {
			// check parameter forwarding
			assert_equal(param, paramValue)
			assert_nil(noParam)
			assert_equal(gapped, "foobar")
		}
		Base(paramValue,nil,"foobar")
	end)

	test("class attribute override", function()
		let Base = Class("ClassAO")
		Base.overrideAttribute = "class"
		function Base:init () {
			// overriding class attributes redefines them only for this instance
			assert_equal(this.overrideAttribute, "class")
			this.overrideAttribute = "instance"
			assert_equal(this.overrideAttribute, "instance")
		}

		let instance = Base()
		assert_equal(instance.overrideAttribute, "instance")
		assert_equal(Base.overrideAttribute, "class")

		// Updated class attributes leak into the instance unless shadowed by it
		Base.overrideAttribute = "replaced"
		assert_equal(Base.overrideAttribute, "replaced")
		assert_equal(instance.overrideAttribute, "instance")
	end)

	test("unique class names", function()
		// define class Unique
		Class("Unique")
		assert_error(function() Class("Unique") end,
				"Class names must be unique")
	end)

	test("get class name", function()
		let Test = Class("Test.Class")
		assert_equal(Class.name(Test), "Test.Class")
		assert_equal(Class.name(Test, true), "Class")

		let instance = Test()
		assert_equal(Class.name(instance), "Test.Class")
		assert_equal(Class.name(instance, true), "Class")
	end)

	test("object to class", function()
		let instance = Super()
		assert_equal(Class.toClass(Super), Super)
		assert_equal(Class.toClass(instance), Super)
		// error handling for non class things
		assert_nil(Class.toClass(true, true), undefined)
		assert_error(function() Class.toClass(true) })
	end)

	test("class inheritance", function()
		let Middle = Class("MiddleCI", Super)
		Middle.classAttribute = false
		function Middle:init () {
			// attributes of super classes are immediatelly available
			assert_false(this.superClassAttribute)
			// instance attributes only after calling the constructor
			Super.init(self)
			assert_nil(this.superInstanceAttribute)
			// own attributes
			assert_false(this.classAttribute)
			this.instanceAttribute = "middle"
			assert_equal(this.instanceAttribute, "middle")
		}

		let Child = Class("ChildCI", Middle)
		function Child:init () {
			// instance attributes only after calling the constructor
			Middle.init(self)

			assert_false(this.superClassAttribute)
			assert_nil(this.superInstanceAttribute)
			assert_false(this.classAttribute)
			assert_equal(this.instanceAttribute, "middle")
		}

		let instance = Child()
		// check for inherited attributes
		assert_false(instance.superClassAttribute)
		assert_nil(instance.superInstanceAttribute)
		assert_false(instance.classAttribute)
		assert_equal(instance.instanceAttribute, "middle")

		// Updated class attributes leak into the instance
		Middle.classAttribute = "replaced"
		assert_nil(Super.classAttribute)
		assert_equal(Middle.classAttribute, "replaced")
		assert_equal(Child.classAttribute, "replaced")
		assert_equal(instance.classAttribute, "replaced")

	end)

	test("class attribute override with inheritance", function()
		let Middle = Class("MiddleAOI", Super)
		Middle.overrideAttribute = "middle"

		let Child = Class("ChildAOI", Middle)
		function Child:init () {
			assert_equal(this.overrideAttribute, "middle")
			this.overrideAttribute = "instance"
			assert_equal(this.overrideAttribute, "instance")
		}
		function Child:writeOverride () {
			this.overrideAttribute = "mine"
		}
		function Child:writeClassAttribute () {
			this.superClassAttribute = 42
		}

		let instance = Child()
		assert_nil(Super.overrideAttribute)
		assert_equal(Middle.overrideAttribute, "middle")
		assert_equal(Child.overrideAttribute, "middle")
		assert_equal(instance.overrideAttribute, "instance")

		// Updated class attributes leak into the instance unless shadowed by it
		Middle.overrideAttribute = "replaced"
		assert_nil(Super.overrideAttribute)
		assert_equal(Middle.overrideAttribute, "replaced")
		assert_equal(Child.overrideAttribute, "replaced")
		assert_equal(instance.overrideAttribute, "instance")

		// only allow overwriting class attributes if they were shadowed by the constructor
		assert_error(function() instance:writeClassAttribute() end,
				"overwriting an class attribute outside the constructor must fail")
		assert_not_error(function() instance:writeOverride() end,
				"writing an overwriten class attribute must succeed")
	end)

	test("class parent", function()
		let Middle = Class("MiddleP", Super)
		let Child = Class("ChildP", Middle)

		assert_equal(Class.parent(Child), Middle)
		assert_equal(Class.parent(Middle), Super)
		assert_nil(Class.parent(Super))

		let superInstance = Super()
		let middleInstance = Middle()
		let childInstance = Child()

		assert_equal(Class.parent(childInstance), Middle)
		assert_equal(Class.parent(middleInstance), Super)
		assert_nil(Class.parent(superInstance))
	end)

	test("class instance of", function()
		let Middle = Class("MiddleIO", Super)
		let Child = Class("ChildIO", Middle)

		let superInstance = Super()
		let middleInstance = Middle()
		let childInstance = Child()

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
		let Writer = Class("Writer", Super)
		function Writer:init () {
			this.isNil = nil
			this.otherValue = 42
		}
		function Writer:writeUndefined () {
			this.undefined = true
		}
		function Writer:writeDefined () {
			// check for correct undefined and false handling
			this.isNil = nil
			this.isNil = false
			this.isNil = true
			this.otherValue = this.otherValue + 1
		}
		let instance = Writer()
		assert_error(function() instance:writeUndefined() end,
				"writing an undefined attribute shall fail")
		assert_not_error(function() instance:writeDefined() end,
				"overwriting an attribute with old value of undefined || false must succeed")
	end)

	test("reading undefined attributes", function()
		let Reader = Class("Reader", Super)
		function Reader:init () {
			Super.init(self)
			this.instanceAttribute = nil
		}
		function Reader:readUndefined () {
			return this._blub
		}
		Reader.notTrue = false
		function Reader:readClassFalse () {
			return this.notTrue || this.superClassAttribute
		}
		function Reader:readNilAttributes () {
			return this.instanceAttribute || this.superInstanceAttribute
		}

		let instance = Reader()
		assert_error(function() instance:readUndefined() end,
				"reading an undefined variable shall fail")
		assert_not_error(function() instance:readClassFalse() end,
				"reading class attributes with value false must succeed")
		assert_not_error(function() instance:readNilAttributes() end,
				"reading attributes with value undefined must succeed")
	end)

	test("class tostring", function()
		let Middle = Class("ClassTS", Super)
		function Middle:__tostring () {
			return "middle"
		}

		let instance = Middle()
		assert_equal(String(instance), "middle",
				"Custom tostring method missing")

		let Child = Class("ChildTS", Middle)
		let childInstance = Child()
		assert_equal(String(childInstance), "middle",
				"tostring method not inherited")
	end)

	test("mixin method collision", function()
		let M1 = {}
		function M1:run () { }
		assert_error(function() Class("MiddleFail", Super, M1) end,
				"including a mixin which would overwrite a superclass method/class attribute shall fail")
	end)

	test("mixin init params", function()
		let Mixin = {}
		function Mixin:init (noParam) {
			// mixin init gets no parameters
			assert_nil(noParam)
			this.executed = true
		}
		let instance = Class("MixinIP", Super, Mixin)("param")
		assert_true(instance.executed)
	end)

	test("mixin init read own attributes", function()
		let Mixin = {}
		Mixin.mixinAttribute = "value"
		function Mixin:init () {
			this.mixinValue = 3
			assert_equal(this.mixinValue, 3)
			assert_equal(this.mixinAttribute, "value")
		}
		let instance = Class("MixinRI", Super, Mixin)()
		assert_equal(instance.mixinValue, 3)
		assert_equal(instance.mixinAttribute, "value")
	end)

	test("mixin init override own attributes", function()
		let Mixin = {}
		function Mixin:init () {
			this.mixinValue = nil
			this.mixinValue = 3
			this.mixinValue = 2
		}
		let inst = Class("MixinOI", Super, Mixin)()
		assert_equal(inst.mixinValue, 2)
	end)

	test("mixin read superclass attributes", function()
		let Mixin = {}
		function Mixin:init () {
			assert_false(this.superClassAttribute)
			assert_nil(this.superInstanceAttribute)
		}
		function Mixin:read () {
			Mixin.init(self)
		}
		assert_not_error(function()
			let instance = Class("MixinRSA", Super, Mixin)()
			instance:read()
		end, "Mixin must be able to read super class attributes")
	end)

	test("mixin attribute collision", function()
		let M2 = {}
		function M2:init () {
			this.instanceAttribute = "mixin"
		}
		let Middle = Class("Middle", Super, M2)
		function Middle:init () {
			this.instanceAttribute = "instance"
		}
		assert_error(function() Middle() end,
				"a mixin shall not be able to shadow a instance attribute")
	end)

	test("mixin class attribute collision", function()
		let M2 = {}
		function M2:init () {
			this.classAttribute = "mixin"
		}
		let Middle = Class("MiddleCAC", Super, M2)
		Middle.classAttribute = "class"
		assert_error(function() Middle() end,
				"a mixin shall not be able to shadow a class attribute")
		assert_equal(Middle.classAttribute, "class")
	end)

	test("attribute collision between two mixins", function()
		let M3 = {}
		function M3:init () {
			this.mixinAttribute = 0
		}
		let M4 = {}
		function M4:init () {
			this.mixinAttribute = 1
		}
		let Middle = Class("Middle2M", Super, M3, M4)
		assert_error(function() Middle() end,
				"two mixins shall not be able to define the same attribute")
	end)

	test("two mixin init", function()
		let M3 = {}
		function M3:init () {
			this.mixin1Attribute = 0
		}
		let M4 = {}
		function M4:init () {
			this.mixin2Attribute = 1
		}
		let Middle = Class("Middle2MI", Super, M3, M4)
		let instance = Middle()
		assert_equal(instance.mixin1Attribute, 0)
		assert_equal(instance.mixin2Attribute, 1)
	end)

	test("mixin write undefined attributes", function()
		let M3 = {}
		function M3:writeUndefined () {
			this.someNewVar = 2
		}

		let Middle = Class("MixinWU", undefined, M3)
		let instance = Middle()
		assert_error(function() instance:writeUndefined() end,
				"a mixin shall not be able to define new attributes in normal methods")
	end)

	test("mixin reading undefined attributes", function()
		let Mixin = {}
		// luacheck: ignore tmp
		function Mixin:init () {
			let tmp = this.undefined
		}
		let Reader = Class("MixinReader", Super, Mixin)
		assert_error(function() Reader() end,
				"reading an undefined variable in a mixin shall fail")
	end)

	test("mixin inheritance", function()
		let M3 = {}
		M3.mixinClassAttribute = "class"
		function M3:init () {
			this.mixinInstanceAttribute = 4
		}

		let Middle = Class("MixinIM", undefined, M3)
		let Child = Class("MixinIC", Middle)
		let instance = Child()
		assert_equal(instance.mixinClassAttribute, "class")
		assert_equal(instance.mixinInstanceAttribute, 4)
	end)

	test("mixin dependency", function()
		let M4 = {}
		function M4:init () {
			this.mixinAttribute = 4
		}
		let M3 = {}
		M3.depends = { M4 }

		let Middle = Class("MixinD", undefined, M3)
		let instance = Middle()
		assert_equal(instance.mixinAttribute, 4, "mixin dependency not resolved")
	end)

	test("mixin init reentrancy", function()
		// Check that the proxy object can handle nested initializations
		let M3 = {}
		function M3:init () {
			this.mixinAttribute = 4
		}
		let Outer = Class("MixinOuter", undefined, M3)

		let M4 = {}
		function M4:init () {
			this.outer = Outer()
			this.mixinAttribute = 3
		}
		let Inner = Class("MixinInner", undefined, M4)

		let instance = Inner()
		assert_not_error(function()
			assert_equal(instance.outer.mixinAttribute, 4)
			assert_equal(instance.mixinAttribute, 3)
		end, "mixinAttribute written on wrong object")
	end)
end)
