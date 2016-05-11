# ***************************************************************************
# *   Copyright 2015 Philipp Nordhus                                        *
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

FIND_PATH(USB_INCLUDE_DIR
  NAMES libusb.h
  HINTS
  $ENV{USB_DIR}
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

FIND_LIBRARY(USB_LIBRARIES
  NAMES usb-1.0
  HINTS
  $ENV{USB_DIR}
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

INCLUDE(FindPackageHandleStandardArgs)
# handle the QUIETLY and REQUIRED arguments and set USB_FOUND to TRUE if
# all listed variables are TRUE
FIND_PACKAGE_HANDLE_STANDARD_ARGS(USB  DEFAULT_MSG  USB_LIBRARIES USB_INCLUDE_DIR)

MARK_AS_ADVANCED(USB_INCLUDE_DIR USB_LIBRARIES)

if (USB_FOUND)
    # FIXME library type
    add_library(lib::usb UNKNOWN IMPORTED)
    set_property(TARGET lib::usb PROPERTY INTERFACE_INCLUDE_DIRECTORIES "${USB_INCLUDE_DIR}")
    set_target_properties(lib::usb PROPERTIES IMPORTED_LOCATION "${USB_LIBRARIES}")
endif()
