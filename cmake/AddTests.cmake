add_test(NAME lua-luacheck-base
    COMMAND luacheck -q .
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/lua/base")

add_test(NAME lua-luacheck-marvin
    COMMAND luacheck -q .
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/lua/marvin")

add_test(NAME typescript-tslint-base
	COMMAND tslint -p tsconfig.json -c ../tslint.yaml
	WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/typescript/base")

add_test(NAME lua-unittest-marvin
    COMMAND amun-cli "strategy/lua/marvin/init.lua" "Unit Tests/ all"
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}")

add_test(NAME lua-unittest-marvin-blue
    COMMAND amun-cli "--as-blue" "strategy/lua/marvin/init.lua" "Unit Tests/ all"
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}")

# show what went wrong by default
add_custom_target(check COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure
    USES_TERMINAL)
add_dependencies(check amun-cli)
