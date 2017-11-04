#.rst:
# FindUSB
# -------
#
# Finds the libusb-1.0 library
#
# This will define the following variables::
#
#   USB_FOUND - True if the system has the libusb library
#
# and the following imported targets::
#
#   lib::usb  - The libusb library

# ***************************************************************************
# *   Copyright 2016 Michael Eischer, Philipp Nordhus                       *
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

find_path(USB_INCLUDE_DIR
  NAMES libusb.h
  HINTS $ENV{USB_DIR}
  PATH_SUFFIXES include/libusb-1.0
  PATHS
    ~/Library/Frameworks
    /Library/Frameworks
    /usr/local
    /usr
    /sw # Fink
    /opt/local # DarwinPorts
    /opt/csw # Blastwave
    /opt
)

find_library(USB_LIBRARY
  NAMES usb-1.0
  HINTS $ENV{USB_DIR}
  PATH_SUFFIXES lib64 lib
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

if (MINGW)
	sanitize_env()
	find_program(USB_LIBRARY_DLL
	  NAMES libusb-1.0.dll
	  HINTS $ENV{USB_DIR}
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
	set(USB_LIB_EXTRA USB_LIBRARY_DLL)
	restore_env()
elseif()
	set(USB_LIB_EXTRA)
endif()

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(USB
  FOUND_VAR USB_FOUND
  REQUIRED_VARS
    USB_LIBRARY
    USB_INCLUDE_DIR
	${USB_LIB_EXTRA}
)
mark_as_advanced(
  USB_INCLUDE_DIR
  USB_LIBRARY
  ${USB_LIB_EXTRA}
)

if(USB_FOUND)
  add_library(lib::usb UNKNOWN IMPORTED)
  set_target_properties(lib::usb PROPERTIES
    IMPORTED_LOCATION "${USB_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${USB_INCLUDE_DIR}"
  )
  if(MINGW)
    set_target_properties(lib::usb PROPERTIES
      IMPORTED_LOCATION "${USB_LIBRARY_DLL}"
      INTERFACE_LINK_LIBRARIES "${USB_LIBRARY}"
    )
  endif()
endif()
