return function()
    local vec = Vector(0, 1)
    assert(not vec:isReadonly(), "vector shouldn't be readonly")
    local vec_readonly = Vector(0, 1, true)
    assert(vec_readonly:isReadonly(), "vector must be readonly")
end
