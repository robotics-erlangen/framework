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
include(GNUInstallDirs)

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
function(EPHelper_Add_Clobber target patch)
    externalproject_get_property(${target} install_dir)
    set(clobber_patch_copy ${install_dir}/patch.copy)
    # cmake tracks changes to commands and recreates the command output if the command has changed
    # Changes to dependencies are NOT checked. The following custom command will therefore always
    # be run when the patch filename changes. In case the patch itself is changed and thus gets
    # a recent modification timestamp, the usual make dependency handling applies.
    add_custom_command(OUTPUT ${clobber_patch_copy}
        COMMAND ${CMAKE_COMMAND} -E copy_if_different ${patch} ${clobber_patch_copy}
        DEPENDS ${patch})

    # patch cmake download step. This ensures that the download step command changes when
    # switching to a non-clobber branch which in turn retriggers the download step. Without
    # this switching to a branch without the clobber step and building the code will not undo
    # the effects of the patch. In addition when switching back the clobber_patch_copy will
    # already exist causing the download steps to be skipped which in turn can cause a build
    # failure. Depend on the clobber_patch_copy to trigger a download run whenever the patch
    # file has changed.
    _ep_get_step_stampfile(${target} download stamp_file)
    add_custom_command(
        OUTPUT ${stamp_file}
        COMMAND ${CMAKE_COMMAND} -E echo ${patch}
        DEPENDS ${clobber_patch_copy}
        APPEND
    )
endfunction(EPHelper_Add_Clobber)

function(EPHelper_Mark_For_Download target)
    if (NOT TARGET ${target}-download)
        ExternalProject_Add_StepTargets(${target} download)
    endif()
    add_dependencies(download ${target}-download)
endfunction(EPHelper_Mark_For_Download)
