local Class = require "../base/class"

return function()
    local M1 = {}
    function M1:run()
    end
    local Super = Class.newTask("Super")
    function Super:run()
    end
    function Super:init()
        self.foo = nil
    end
    local noFail, msg = pcall(Class.newTask, "MiddleFail", Super, M1)
    assert(not noFail, "including a mixin which has a method with the same name as a superclass shall fail")

    local M2 = {}
    function M2:doThings()
    end
    function M2:init()
        self.bla = 2
    end
    local Middle = Class.newTask("Middle", Super, M2)
    function Middle:init()
        self.bla = 1
    end
    noFail, msg = pcall(Middle.create)
    assert(not noFail, "a mixin shall not be able to define an attribute which is defined by a class")

    local Middle2 = Class.newTask("Middle2", Super)
    local M3 = {}
    function M3:init()
        self.foo = 4
    end
    function M3:tryTheForbidden()
        self.someNewVar = 2
    end
    local Sub = Class.newTask("Sub", Middle2, M3)
    noFail, msg = pcall(Sub.create)
    assert(not noFail, "a mixin shall not be able to define an attribute which is defined by a superclass")


    local C = Class.newTask("C", nil, M3)
    function C:alsoTryTheForbidden()
        self.someOtherVar = 3
    end
    local inst = C.create()
    noFail, msg = pcall(inst.tryTheForbidden, inst)
    assert(not noFail, "a mixin shall not be able to define new attributes in normal methods")
    noFail, msg = pcall(inst.alsoTryTheForbidden, inst)
    assert(not noFail, "a class shall not be able to define new attributes in normal methods")

    noFail, msg = pcall(Class.newTask, "C")
    assert(not noFail, "it shall not be possible to create classes with the same name")

    local C1 = Class.newTask("C1", C)
    inst = C1.create()
    assert(inst.foo, "mixins shall be inherited")
end
