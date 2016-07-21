context("base.class", function()
    local Super = Class("Super")
    function Super:run()
    end
    function Super:init()
        self.foo = nil
    end

    test("mixin method collision", function ()
        local M1 = {}
        function M1:run()
        end
        assert_error(function () Class("MiddleFail", Super, M1) end,
                "including a mixin which has a method with the same name as a superclass shall fail")
    end)

    test("mixin attribute collision", function ()
        local M2 = {}
        function M2:doThings()
        end
        function M2:init()
            self.bla = 2
        end
        local Middle = Class("Middle", Super, M2)
        function Middle:init()
            self.bla = 1
        end
        assert_not_nil(function() Middle() end)
        assert_error(function() Middle() end,
                "a mixin shall not be able to define an attribute which is defined by a class")
    end)

	test("attribute collision betweet two mixin", function()
		local M3={}
		function M3:init() self.bla=0 end
		local M4={}
		function M4:init() self.bla=1 end
		local Middle2M = Class("Middle2M", Super, M3, M4)
		assert_not_nil(function() Middle2M() end)
		assert_error(function() Middle2M() end, "two mixin shall not be able to define the same attribute")
	end)

	test("reading in mixin", function()
		local Mixin={}
		function Mixin:init() self.bla=3 assert_not_nil(self.bla) end
		local inst = Class("MiddleRM",Super,Mixin)()
		assert_not_nil(inst.bla)
	end)

	test("reding undefined attributes", function()
		local reader = Class("Reader",Super)
		function reader:read() local loc = self._blub end
		local inst = reader()
		assert_error(function() inst:read() end, "reading an undefinded variable shall fail")
	end)

	test("mixin reading undefined attributes", function()
		local Mixin = {}
		function Mixin:init() self.bla = self.blub end
		assert_error(function() Class("MReader",Super,Mixin)() end, "reading an undefined varibale in a Mixin shall fail")
	end)

    test("mixin inheritance", function ()
        local Middle2 = Class("Middle2", Super)
        local M3 = {}
        function M3:init()
            self.foo = 4
        end
        function M3:tryTheForbidden()
            self.someNewVar = 2
        end
        local Sub = Class("Sub", Middle2, M3)
        assert_not_nil(function() Sub() end)
        assert_error(function() Sub() end,
                "a mixin shall not be able to define an attribute which is defined by a superclass")


        local C = Class("C", nil, M3)
        function C:alsoTryTheForbidden()
            self.someOtherVar = 3
        end
        local inst = C()
        assert_error(function () inst.tryTheForbidden(inst) end,
                "a mixin shall not be able to define new attributes in normal methods")
        assert_error(function () inst.alsoTryTheForbidden(inst) end,
                "a class shall not be able to define new attributes in normal methods")

        assert_error(function () Class("C") end,
                "it shall not be possible to create classes with the same name")

        local C1 = Class("C1", C)
        inst = C1()
        assert_not_nil(inst.foo, "mixins shall be inherited")
    end)
end)
