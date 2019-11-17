# ***************************************************************************
# *   Copyright 2019 Michael Eischer                                        *
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

# make sure to remove installation remainders after a new download
function(EPHelper_Add_Cleanup target)
    externalproject_get_property(${target} install_dir)
    ExternalProject_Add_Step(${target} cleanup
        COMMAND rm -rf ${ARGN} || true
        WORKING_DIRECTORY "${install_dir}"
        COMMENT "Cleanup old install"
        DEPENDEES download
        DEPENDERS configure
    )
endfunction(EPHelper_Add_Cleanup)

# CMake does not undo an already applied patch before applying another one
# The clobber step depends on the patch file or a stub patch to ensure that
# it is triggered whenever the patch file changed
# Warning: cmake fails to undo the patch when switching to a branch without PATCH_COMMAND!
# therefore always add the clobber step with the stub patch even when no PATCH_COMMAND is
# currently necessary
function(EPHelper_Add_Clobber target patch)
    externalproject_get_property(${target} install_dir)
    set(clobber_patch_copy ${install_dir}/patch.copy)
    add_custom_command(OUTPUT ${clobber_patch_copy}
        COMMAND ${CMAKE_COMMAND} -E copy_if_different ${patch} ${clobber_patch_copy}
        DEPENDS ${patch})
    ExternalProject_Add_Step(${target} clobber
        COMMAND true
        WORKING_DIRECTORY "${install_dir}"
        DEPENDERS download
        DEPENDS ${clobber_patch_copy}
    )
endfunction(EPHelper_Add_Clobber)
