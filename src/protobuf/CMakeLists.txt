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

add_library(protobuf STATIC
    include/protobuf/command.h
    include/protobuf/geometry.h
    include/protobuf/robot.h
    include/protobuf/robotcommand.h
    include/protobuf/ssl_referee.h
    include/protobuf/status.h
    include/protobuf/sslsim.h

    command.cpp
    geometry.cpp
    robot.cpp
    ssl_referee.cpp
)

set(PROTO_FILES
    protobuf/command.proto
    protobuf/debug.proto
    protobuf/gamestate.proto
    protobuf/logfile.proto
    protobuf/robot.proto
    protobuf/ssl_detection.proto
    protobuf/ssl_game_controller_auto_ref.proto
    protobuf/ssl_game_controller_common.proto
    protobuf/ssl_game_controller_geometry.proto
    protobuf/ssl_game_controller_team.proto
    protobuf/ssl_game_event_2019.proto
    protobuf/ssl_geometry.proto
    protobuf/ssl_gc_api.proto
    protobuf/ssl_gc_ci.proto
    protobuf/ssl_gc_change.proto
    protobuf/ssl_gc_engine_config.proto
    protobuf/ssl_gc_engine.proto
    protobuf/ssl_gc_state.proto
    protobuf/ssl_mixed_team.proto
    protobuf/ssl_referee.proto
    protobuf/ssl_referee_game_event.proto
    protobuf/ssl_vision_detection_tracked.proto
    protobuf/ssl_vision_wrapper_tracked.proto
    protobuf/ssl_simulation_robot_control.proto
    protobuf/ssl_simulation_error.proto
    protobuf/ssl_simulation_robot_feedback.proto
    protobuf/ssl_simulation_control.proto
    protobuf/ssl_simulation_config.proto
    protobuf/ssl_simulation_custom_erforce_realism.proto
    protobuf/ssl_wrapper.proto
    protobuf/status.proto
    protobuf/userinput.proto
    protobuf/world.proto
    protobuf/timeline.proto
    protobuf/pathfinding.proto
    protobuf/grsim_commands.proto
    protobuf/grsim_packet.proto
    protobuf/grsim_replacement.proto
    protobuf/ssl_simulation_custom_erforce_robot_spec.proto
)

set(PROTO_BINARY_DIR "${CMAKE_CURRENT_BINARY_DIR}")

protobuf_generate(
    PROTOS ${PROTO_FILES}
    TARGET protobuf
    PROTOC_OUT_DIR ${PROTO_BINARY_DIR}
)

# disable warnings for generated files
target_compile_options(protobuf PUBLIC -w)

target_link_libraries(protobuf
    PUBLIC ${PROTOBUF_LIBRARY}
    PUBLIC Threads::Threads
    PUBLIC Qt5::Core
)
target_include_directories(protobuf
    PUBLIC include
    PRIVATE include/protobuf

    # We want users of this library to include the generated headers using
    # #include "protobuf/..."
    PUBLIC ${PROTO_BINARY_DIR}
)
target_include_directories(protobuf SYSTEM
    PUBLIC ${PROTOBUF_INCLUDE_DIR}
    PRIVATE ${PROTOBUF_INCLUDE_DIR}
)

if(TARGET project_protobuf)
    add_dependencies(protobuf project_protobuf)
endif()

add_library(shared::protobuf ALIAS protobuf)
