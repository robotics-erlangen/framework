# ***************************************************************************
# *   Copyright 2021 Andreas Wendler                                        *
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
include(ExternalProjectHelper)

set(GAMECONTROLLER_RELEASE_VERSION v2.16.1)
# often the same as the version string, but not always
set(GAMECONTROLLER_RELEASE_NAME v2.16.1)

if(APPLE)
    set(GAMECONTROLLER_OS_STRING darwin_amd64)
    set(GAMECONTROLLER_EXECUTABLE_HASH 539502dad151f5e54051d31d085d49188c8f0d476f85d3436859175dd70440ff)
elseif(MINGW)
    set(GAMECONTROLLER_OS_STRING windows_amd64.exe)
    set(GAMECONTROLLER_EXECUTABLE_HASH e464e13eef37ab85a6681e684147c0803d451fa1027642b1934ab4dd0c67edc8)
else()
    set(GAMECONTROLLER_OS_STRING linux_amd64)
    set(GAMECONTROLLER_EXECUTABLE_HASH 89ea086453ab6433f1f4c095e87ef858e56399c12b00de403b7975d9524dff0b)
endif()

set(GAMECONTROLLER_DOWNLOAD_LOCATION https://github.com/RoboCup-SSL/ssl-game-controller/releases/download/${GAMECONTROLLER_RELEASE_NAME}/ssl-game-controller_${GAMECONTROLLER_RELEASE_VERSION}_${GAMECONTROLLER_OS_STRING})


ExternalProject_Add(gamecontroller_download
    URL ${GAMECONTROLLER_DOWNLOAD_LOCATION}
    URL_HASH SHA256=${GAMECONTROLLER_EXECUTABLE_HASH}
    DOWNLOAD_NO_EXTRACT true
    CONFIGURE_COMMAND ""
    BUILD_COMMAND ""
    INSTALL_COMMAND ""
    DOWNLOAD_NO_PROGRESS true
    DOWNLOAD_DIR "${DEPENDENCY_DOWNLOADS}"
)
EPHelper_Add_Cleanup(gamecontroller_download bin include lib share)
EPHelper_Add_Clobber(gamecontroller_download ${CMAKE_CURRENT_LIST_DIR}/stub.patch)
EPHelper_Mark_For_Download(gamecontroller_download)

ExternalProject_Get_property(gamecontroller_download DOWNLOADED_FILE)

set(GAMECONTROLLER_FULL_PATH ${DOWNLOADED_FILE})
get_filename_component(GAMECONTROLLER_FILE_NAME ${DOWNLOADED_FILE} NAME)
