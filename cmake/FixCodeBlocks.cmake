# Workaround a limitation in the codeblocks generator
# This allows QtCreator to make better guesses for the executables a sourcefile belongs to

set(FAKE_TARGETS CACHE INTERNAL "Fake targets")

if("${CMAKE_EXTRA_GENERATOR}" STREQUAL "CodeBlocks")
    function(add_executable targetName)
        _add_executable(${targetName} ${ARGN})
        if (NOT "${ARGN}" STREQUAL "IMPORTED")
            get_target_property(TARGET_SOURCES ${targetName} SOURCES)
            add_library(${targetName}_fake EXCLUDE_FROM_ALL ${TARGET_SOURCES})
            set(FAKE_TARGETS ${FAKE_TARGETS} ${targetName} CACHE INTERNAL "Fake targets")
        endif()
    endfunction(add_executable)
endif()

function(fixup_targets)
    foreach(targetName ${FAKE_TARGETS})
        get_target_property(TARGET_INCLUDE_DIRECTORIES ${targetName} INCLUDE_DIRECTORIES)
        get_target_property(TARGET_COMPILE_DEFINITIONS ${targetName} COMPILE_DEFINITIONS)
        set_target_properties(${targetName}_fake PROPERTIES INCLUDE_DIRECTORIES "${TARGET_INCLUDE_DIRECTORIES}")
        set_target_properties(${targetName}_fake PROPERTIES COMPILE_DEFINITIONS "${TARGET_COMPILE_DEFINITIONS}")
    endforeach(targetName)
endfunction(fixup_targets)
