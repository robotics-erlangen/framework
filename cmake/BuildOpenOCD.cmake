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
ExternalProject_Add(project_openocd
    URL http://www.robotics-erlangen.de/downloads/libraries/openocd-0.10.0.tar.bz2
    URL_HASH SHA256=7312e7d680752ac088b8b8f2b5ba3ff0d30e0a78139531847be4b75c101316ae
    DOWNLOAD_NO_PROGRESS true
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
externalproject_get_property(project_openocd install_dir)
set_target_properties(project_openocd PROPERTIES EXCLUDE_FROM_ALL true)
add_executable(firmware::openocd IMPORTED)
add_dependencies(firmware::openocd project_openocd)
set_property(TARGET firmware::openocd PROPERTY IMPORTED_LOCATION "${install_dir}/bin/openocd")
