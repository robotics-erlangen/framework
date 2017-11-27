add_test(NAME luacheck-base
    COMMAND luacheck -q .
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/base")

#add_test(NAME unittest
#    COMMAND amun-cli "strategy/strategy/init.lua" "Unit Tests/ all"
#    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}")

# show what went wrong by default
add_custom_target(check COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure
    USES_TERMINAL)
add_dependencies(check amun-cli)
