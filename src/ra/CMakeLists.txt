# ***************************************************************************
# *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

add_subdirectory(guihelper)
add_subdirectory(input)
add_subdirectory(logcutter)
add_subdirectory(plotter)
add_subdirectory(widgets)

add_library(ra-horus STATIC
    aboutus.cpp
    aboutus.h
	custompalettewidget.cpp
	custompalettewidget.h
    configdialog.cpp
    configdialog.h
    inputwidget.cpp
    inputwidget.h
    gitinfodialog.cpp
    gitinfodialog.h
    gitinfowidget.cpp
    gitinfowidget.h
    mainwindow.cpp
    mainwindow.h
    refereewidget.cpp
    refereewidget.h
    resettableitemdelegate.cpp
    resettableitemdelegate.h
    robotselectionwidget.cpp
    robotselectionwidget.h
    robotspecsdialog.cpp
    robotspecsdialog.h
    robotuiaction.cpp
    robotuiaction.h
    robotwidget.cpp
    robotwidget.h
    optionswidget.cpp
    optionswidget.h
    simulatorwidget.cpp
    simulatorwidget.h
    simulatorconfigwidget.cpp
    simulatorconfigwidget.h
    savedirectorydialog.cpp
    savedirectorydialog.h
    strategysearch.cpp
    strategysearch.h
    strategyselectionwidget.cpp
    strategyselectionwidget.h
    logopener.cpp
    logopener.h
    refereeinfowidget.cpp
    refereeinfowidget.h
    loglabel.h
    loglabel.cpp
    loggingsuite.h
    loggingsuite.cpp
    logfileselectiondialog.cpp
    logfileselectiondialog.h
    fieldparameters.cpp
    fieldparameters.h
)

set(UI_SOURCES
    aboutus.ui
	custompalettewidget.ui
    configdialog.ui
    inputwidget.ui
    gitinfodialog.ui
    gitinfowidget.ui
    mainwindow.ui
    refereewidget.ui
    robotselectionwidget.ui
    robotspecsdialog.ui
    optionswidget.ui
    simulatorwidget.ui
    simulatorconfigwidget.ui
    savedirectorydialog.ui
    strategyselectionwidget.ui
    refereeinfowidget.ui
    logfileselectiondialog.ui
    fieldparameters.ui
)

qt5_wrap_ui(UIC_SOURCES ${UI_SOURCES})

target_sources(ra-horus PRIVATE ${UIC_SOURCES})

target_link_libraries(ra-horus
    PUBLIC amun::amun
    PRIVATE gitconfig
    PRIVATE shared::core
    PRIVATE shared::config
    PRIVATE shared::protobuf
    PRIVATE ra::guihelper
    PRIVATE ra::input
    PRIVATE ra::plotter
    PRIVATE ra::logcutter
    PRIVATE ra::widgets
    PRIVATE ${OPENGL_LIBRARIES}
    PRIVATE Qt5::Widgets
    PRIVATE Qt5::OpenGL
    PRIVATE Threads::Threads
)

target_include_directories(ra-horus
    INTERFACE .
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)

target_compile_definitions(ra-horus PRIVATE GAMECONTROLLER_RELEASE_VERSION="${GAMECONTROLLER_RELEASE_VERSION}")

if(${EASY_MODE})
	target_compile_definitions(ra-horus PRIVATE EASY_MODE)
endif()

add_library(ra::ra-horus ALIAS ra-horus)

add_executable(ra WIN32 MACOSX_BUNDLE
    ra.cpp
    ${CMAKE_BINARY_DIR}/startRa.sh
)

add_custom_command(
    OUTPUT ${CMAKE_BINARY_DIR}/startRa.sh
    COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_SOURCE_DIR}/cmake/startRa.sh ${CMAKE_BINARY_DIR}/startRa.sh
    DEPENDS ${CMAKE_SOURCE_DIR}/cmake/startRa.sh
)

if(MINGW)
    target_sources(ra PRIVATE ${CMAKE_SOURCE_DIR}/data/pkg/ra.rc)
endif(MINGW)

# add ra icon
if(APPLE)
    set(RA_ICON ${CMAKE_SOURCE_DIR}/data/pkg/ra.icns)
    set_source_files_properties(${RA_ICON} PROPERTIES MACOSX_PACKAGE_LOCATION Resources)
    target_sources(ra PRIVATE ${RA_ICON})
endif(APPLE)

target_link_libraries(ra
    ra::ra-horus
    Qt5::Widgets
    shared::config
)
v8_copy_deps(ra)
target_include_directories(ra
    PRIVATE "${CMAKE_CURRENT_BINARY_DIR}"
    PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}"
)
if (TARGET lib::jemalloc)
    target_link_libraries(ra lib::jemalloc)
endif()

# add plist file
if(APPLE)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_INFO_PLIST ${CMAKE_SOURCE_DIR}/data/pkg/MacBundleInfo.plist.in)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_ICON_FILE ra.icns)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_GUI_IDENTIFIER de.robotics-erlangen.Ra)
    set_target_properties(ra PROPERTIES MACOSX_BUNDLE_BUNDLE_NAME Ra)
endif(APPLE)
