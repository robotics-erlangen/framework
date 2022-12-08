add_test(NAME lua-luacheck-base
    COMMAND luacheck -q .
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/lua/base")

add_test(NAME typescript-eslint
    COMMAND npm run lint
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/typescript")

add_test(NAME cpp-unittests
    COMMAND cpptests
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}")

add_test(NAME copyright-header-exists
	COMMAND python3 "data/scripts/check-copyright-header.py"
	WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}")

add_test(NAME git-correct-mail
	COMMAND python3 "data/scripts/check-username-and-mail.py"
	WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}")

# show what went wrong by default
add_custom_target(check COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure
    USES_TERMINAL)
add_dependencies(check amun-cli cpptests)

add_custom_target(tsfix
    COMMAND npm run lint-fix
    WORKING_DIRECTORY "${CMAKE_SOURCE_DIR}/strategy/typescript")
