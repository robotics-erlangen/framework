# ***************************************************************************
# *   Copyright 2017 Michael Eischer                                        *
# *   Robotics Erlangen e.V.                                                *
# *   http://www.robotics-erlangen.de/                                      *
# *   info@robotics-erlangen.de                                             *
# *                                                                         *
# *   This program is free software: you can redistribute it and/or modify  *
# *   it under the terms of the GNU General Public License as published by  *
# *   the Free Software Foundation, either version 3 of the License, or     *
# *   any later version.                                                    *
# *                                                                         *
# *   This program is distributed in the hope that it will be useful,       *
# *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
# *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
# *   GNU General Public License for more details.                          *
# *                                                                         *
# *   You should have received a copy of the GNU General Public License     *
# *   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
# ***************************************************************************

# support legacy windows build setups
if (NOT TARGET project_protobuf)
	find_program(Protobuf_LIBRARY_DLL
	  NAMES libprotobuf-9.dll
	  HINTS $ENV{PROTOBUF_DIR}
	  PATH_SUFFIXES bin
	  PATHS
		~/Library/Frameworks
		/Library/Frameworks
		/usr/local
		/usr
		/sw
		/opt/local
		/opt/csw
		/opt
	)
	mark_as_advanced(Protobuf_LIBRARY_DLL)
	if(Protobuf_LIBRARY_DLL)
		set(Protobuf_DLL ${Protobuf_LIBRARY_DLL})
	else()
		set(Protobuf_DLL)
	endif()
endif()

if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    set(LIB_GCC libgcc_s_seh-1.dll)
else()
    set(LIB_GCC libgcc_s_dw2-1.dll)
endif()

add_custom_target(assemble
    COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/config ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/config
    COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/data ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/data
    COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/libs/tsc ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/libs/tsc
	COMMAND ${CMAKE_COMMAND} -E copy_if_different
		$<TARGET_FILE:lib::luajit>
		$<TARGET_FILE:lib::sdl2>
		$<TARGET_FILE:lib::usb>
		$<TARGET_FILE:Qt5::Core>
		$<TARGET_FILE:Qt5::Gui>
		$<TARGET_FILE:Qt5::Network>
		$<TARGET_FILE:Qt5::OpenGL>
		$<TARGET_FILE:Qt5::Widgets>
		$<$<BOOL:$<TARGET_NAME_IF_EXISTS:Qt5::Svg>>:$<TARGET_FILE:Qt5::Svg>>
		${Protobuf_DLL}
		${V8_DLL}
            ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/platforms
	COMMAND ${CMAKE_COMMAND} -E copy_if_different
		$<TARGET_FILE:Qt5::QWindowsIntegrationPlugin>
            ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/platforms
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
		$ENV{MINGW_PREFIX}/bin/${LIB_GCC}
		$ENV{MINGW_PREFIX}/bin/libstdc++-6.dll
		$ENV{MINGW_PREFIX}/bin/libwinpthread-1.dll
		$ENV{MINGW_PREFIX}/bin/libssp-0.dll
            ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}
)

if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    set(PACK_SUFFIX -x64)
else()
    set(PACK_SUFFIX)
endif()

add_custom_target(pack
	COMMAND bash ${CMAKE_SOURCE_DIR}/data/pkg/win-pack.sh ${CMAKE_COMMAND} ${CMAKE_SOURCE_DIR} ${PACK_SUFFIX}
	WORKING_DIRECTORY ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}
	DEPENDS amun-cli logplayer ra visionanalyzer assemble
)
