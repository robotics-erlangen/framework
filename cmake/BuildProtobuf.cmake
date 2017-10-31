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

if(MINGW)
	set(PROTOBUF_SUBPATH "lib/${CMAKE_STATIC_LIBRARY_PREFIX}protobuf${CMAKE_STATIC_LIBRARY_SUFFIX}")
	set(PROTOC_SUBPATH "bin/protoc${CMAKE_EXECUTABLE_SUFFIX}")
	if(POLICY CMP0058) # exists since cmake 3.3
		set(PROTOBUF_BUILD_BYPRODUCTS
			"<INSTALL_DIR>/${PROTOBUF_SUBPATH}"
			"<INSTALL_DIR>/${PROTOC_SUBPATH}"
		)
	else()
		set(PROTOBUF_BUILD_BYPRODUCTS "")
	endif()

	include(ExternalProject)
	ExternalProject_Add(project_protobuf
		URL http://www.robotics-erlangen.de/downloads/libraries/protobuf-cpp-3.4.1.tar.gz
		URL_MD5 74446d310ce79cf20bab3ffd0e8f8f8f
		DOWNLOAD_NO_PROGRESS true
		SOURCE_SUBDIR cmake
		CMAKE_ARGS
			-DCMAKE_INSTALL_PREFIX:PATH=<INSTALL_DIR>
			-DCMAKE_C_COMPILER:PATH=${CMAKE_C_COMPILER}
			-DCMAKE_CXX_COMPILER:PATH=${CMAKE_CXX_COMPILER}
			-DCMAKE_MAKE_PROGRAM:PATH=${CMAKE_MAKE_PROGRAM}
			-DCMAKE_INSTALL_MESSAGE:STRING=NEVER
			-DCMAKE_BUILD_TYPE:STRING=Release
			-DCMAKE_CXX_FLAGS:STRING=-std=gnu++11
			# the tests fail to build :-(
			-Dprotobuf_BUILD_TESTS:BOOL=OFF
		BUILD_BYPRODUCTS ${PROTOBUF_BUILD_BYPRODUCTS}
	)

	externalproject_get_property(project_protobuf install_dir)
	set_target_properties(project_protobuf PROPERTIES EXCLUDE_FROM_ALL true)
	# cmake enforces that the include directory exists
	file(MAKE_DIRECTORY "${install_dir}/include")

	set(PROTOBUF_FOUND true)
	set(PROTOBUF_VERSION "3.4.1")
	set(PROTOBUF_INCLUDE_DIR "${install_dir}/include")
	set(PROTOBUF_INCLUDE_DIRS "${PROTOBUF_INCLUDE_DIR}")
	set(PROTOBUF_LIBRARY "${install_dir}/${PROTOBUF_SUBPATH}")
	set(PROTOBUF_LIBRARIES "${PROTOBUF_LIBRARY}")
	set(Protobuf_PROTOC_EXECUTABLE "${install_dir}/${PROTOC_SUBPATH}")
	message(STATUS "Building protobuf ${PROTOBUF_VERSION}")
else()
	message(FATAL_ERROR "Protobuf not found")
endif()
