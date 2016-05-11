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

add_subdirectory(tracking)

set(SOURCES
    include/processor/networktransceiver.h
    include/processor/processor.h
    include/processor/transceiver.h

    accelerator.cpp
    accelerator.h
    controller.cpp
    controller.h
    debughelper.cpp
    debughelper.h
    networktransceiver.cpp
    processor.cpp
    referee.cpp
    referee.h
    transceiver.cpp
)

if(TARGET lib::usb)
    list(APPEND SOURCES usbdevice.cpp usbdevice.h usbthread.cpp usbthread.h)
endif()

add_library(processor ${SOURCES})
target_link_libraries(processor
    PRIVATE shared::core
    PUBLIC shared::protobuf
    PRIVATE amun::tracking
    PRIVATE firmware::interface
    PUBLIC Qt5::Core
    PRIVATE Qt5::Network
)
target_include_directories(processor
    INTERFACE include
    PRIVATE include/processor
)

if(TARGET lib::usb)
    target_link_libraries(processor PRIVATE lib::usb)
    target_compile_definitions(processor PRIVATE USB_FOUND)
endif()

add_library(amun::processor ALIAS processor)
