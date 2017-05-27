add_test(NAME luacheck-base
    COMMAND luacheck -q .
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/base")

#add_test(NAME unittest
#    COMMAND amun-cli "strategy/strategy/init.lua" "Unit Tests/ all"
#    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}")

if (${CMAKE_VERSION} VERSION_GREATER 3.1.4)
    set(TEST_NINJA_CONSOLE USES_TERMINAL)
else()
    set(TEST_NINJA_CONSOLE)
endif()

# show what went wrong by default
add_custom_target(check COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure
    ${TEST_NINJA_CONSOLE})
