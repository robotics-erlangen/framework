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

include(ExternalProject)
ExternalProject_Add(openocd
    URL http://www.robotics-erlangen.de/downloads/libraries/openocd-0.9.0.tar.bz2
    URL_MD5 665cc98ae9e7297e09ec6ac7235fee49
    PATCH_COMMAND cat ${CMAKE_SOURCE_DIR}/cmake/openocd-clang-compile-fix.diff
        | patch -p1
    CONFIGURE_COMMAND <SOURCE_DIR>/configure
        --prefix=<INSTALL_DIR>
        --enable-ftdi
        --disable-aice
        --disable-armjtagew
        --disable-jlink
        --disable-opendous
        --disable-osbdm
        --disable-rlink
        --disable-stlink
        --disable-ti-icdi
        --disable-ulink
        --disable-usb-blaster-2
        --disable-usbprog
        --disable-vsllink
)
externalproject_get_property(openocd install_dir)
set_target_properties(openocd PROPERTIES EXCLUDE_FROM_ALL true)
set(OPENOCD_FOUND TRUE)
set(OPENOCD_CMD "${install_dir}/bin/openocd")
