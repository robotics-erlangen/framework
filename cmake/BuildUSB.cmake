
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
    # use prebuilt binaries on windows
	set(LIBUSB_SUBPATH "bin/libusb-1.0.dll")
	if(POLICY CMP0058) # exists since cmake 3.3
		set(LIBUSB_BUILD_BYPRODUCTS "<INSTALL_DIR>/${LIBUSB_SUBPATH}")
	else()
		set(LIBUSB_BUILD_BYPRODUCTS "")
	endif()
	include(ExternalProject)
	ExternalProject_Add(project_usb
		EXCLUDE_FROM_ALL true
		URL http://www.robotics-erlangen.de/downloads/libraries/libusb-1.0.21.7z
		URL_MD5 7fbcf5580b8ffc88f3af6eddd638de9f
		DOWNLOAD_NO_PROGRESS true
		CONFIGURE_COMMAND ""
		BUILD_COMMAND ""
		BUILD_IN_SOURCE true
		INSTALL_COMMAND ${CMAKE_COMMAND} -E copy <SOURCE_DIR>/MinGW32/dll/libusb-1.0.dll <INSTALL_DIR>/bin
		COMMAND ${CMAKE_COMMAND} -E copy <INSTALL_DIR>/${LIBUSB_SUBPATH} ${CMAKE_BINARY_DIR}/bin
		COMMAND ${CMAKE_COMMAND} -E copy_directory <SOURCE_DIR>/include <INSTALL_DIR>/include
		BUILD_BYPRODUCTS ${LIBUSB_BUILD_BYPRODUCTS}
	)

	externalproject_get_property(project_usb install_dir)
	add_library(lib::usb UNKNOWN IMPORTED)
	# cmake enforces that the include directory exists
	file(MAKE_DIRECTORY "${install_dir}/include/libusb-1.0")
	set_target_properties(lib::usb PROPERTIES
		IMPORTED_LOCATION "${install_dir}/${LIBUSB_SUBPATH}"
		INTERFACE_INCLUDE_DIRECTORIES "${install_dir}/include/libusb-1.0"
	)
	add_dependencies(lib::usb project_usb)
	set(USB_FOUND true)
else()
    message(WARNING "Get libusb for transmitter support")
    set(USB_FOUND false)
endif()
