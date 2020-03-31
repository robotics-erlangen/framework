add_test(NAME lua-luacheck-base
    COMMAND luacheck -q .
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/lua/base")

add_test(NAME typescript-tslint
    COMMAND tslint -p tsconfig.json -c tslint.yaml
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/typescript")


add_test(NAME copyright-header-exists
	COMMAND python2 "data/scripts/check-copyright-header.py"
	WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}")

# show what went wrong by default
add_custom_target(check COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure
    USES_TERMINAL)
add_dependencies(check amun-cli)

add_custom_target(tsfix
    COMMAND tslint --fix -p tsconfig.json -c tslint.yaml
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/typescript")
