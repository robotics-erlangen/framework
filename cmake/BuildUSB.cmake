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
    set(LIBUSB_SUBPATH "bin/libusb-1.0${CMAKE_SHARED_LIBRARY_SUFFIX}")

    set(BITS 32)
    if(MINGW64)
        set(BITS 64)
    endif()

    include(ExternalProject)
    include(ExternalProjectHelper)
    ExternalProject_Add(project_usb
        EXCLUDE_FROM_ALL true
        URL http://www.robotics-erlangen.de/downloads/libraries/libusb-1.0.21.7z
        URL_HASH SHA256=acdde63a40b1477898aee6153f9d91d1a2e8a5d93f832ca8ab876498f3a6d2b8
        DOWNLOAD_NO_PROGRESS true
        CONFIGURE_COMMAND ""
        BUILD_COMMAND ""
        BUILD_IN_SOURCE true
        INSTALL_COMMAND ${CMAKE_COMMAND} -E copy <SOURCE_DIR>/MinGW${BITS}/dll/libusb-1.0.dll <INSTALL_DIR>/bin
        COMMAND ${CMAKE_COMMAND} -E copy <SOURCE_DIR>/MinGW${BITS}/dll/libusb-1.0.dll.a <INSTALL_DIR>/bin
        COMMAND ${CMAKE_COMMAND} -E copy_directory <SOURCE_DIR>/include <INSTALL_DIR>/include
        BUILD_BYPRODUCTS
            "<INSTALL_DIR>/${LIBUSB_SUBPATH}"
            "<INSTALL_DIR>/${LIBUSB_SUBPATH}.a"
        DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
    )
    EPHelper_Mark_For_Download(project_usb)

    externalproject_get_property(project_usb install_dir)
    add_library(lib::usb UNKNOWN IMPORTED)
    # cmake enforces that the include directory exists
    file(MAKE_DIRECTORY "${install_dir}/include/libusb-1.0")
    set_target_properties(lib::usb PROPERTIES
        IMPORTED_LOCATION "${install_dir}/${LIBUSB_SUBPATH}"
        INTERFACE_LINK_LIBRARIES "${install_dir}/${LIBUSB_SUBPATH}.a"
        INTERFACE_INCLUDE_DIRECTORIES "${install_dir}/include/libusb-1.0"
    )
    add_dependencies(lib::usb project_usb)
    set(USB_FOUND true)
    message(STATUS "Building libusb 1.0.21")
else()
    message(WARNING "Get libusb for transmitter support")
    set(USB_FOUND false)
endif()
