# ***************************************************************************
# *   Copyright 2025 Paul Bergmann                                          *
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

# This file is heavily coupled to BuildProtobuf.cmake and only in a separate
# file to keep the other file a bit more terse.

function(bundle_protobuf_dependencies library_name byproducts)
    # We could use Abseil in our own code if we wanted to but to do that properly,
    # we would need to create the proper imported targets (check the generated
    # abslConfig files in the ExternalProject build directory).
    #
    # Since we do not currently want this, we simply use this list of libraries
    # found in the ExternalProjects build directory.
    set(_protobuf_dependencies
        absl_bad_any_cast_impl
        absl_bad_optional_access
        absl_bad_variant_access
        absl_base
        absl_city
        absl_civil_time
        absl_cord
        absl_cord_internal
        absl_cordz_functions
        absl_cordz_handle
        absl_cordz_info
        absl_cordz_sample_token
        absl_crc32c
        absl_crc_cord_state
        absl_crc_cpu_detect
        absl_crc_internal
        absl_debugging_internal
        absl_demangle_internal
        absl_die_if_null
        absl_examine_stack
        absl_exponential_biased
        absl_failure_signal_handler
        absl_flags
        absl_flags_commandlineflag
        absl_flags_commandlineflag_internal
        absl_flags_config
        absl_flags_internal
        absl_flags_marshalling
        absl_flags_parse
        absl_flags_private_handle_accessor
        absl_flags_program_name
        absl_flags_reflection
        absl_flags_usage
        absl_flags_usage_internal
        absl_graphcycles_internal
        absl_hash
        absl_hashtablez_sampler
        absl_int128
        absl_kernel_timeout_internal
        absl_leak_check
        absl_log_entry
        absl_log_flags
        absl_log_globals
        absl_log_initialize
        absl_log_internal_check_op
        absl_log_internal_conditions
        absl_log_internal_format
        absl_log_internal_globals
        absl_log_internal_log_sink_set
        absl_log_internal_message
        absl_log_internal_nullguard
        absl_log_internal_proto
        absl_log_severity
        absl_log_sink
        absl_low_level_hash
        absl_malloc_internal
        absl_periodic_sampler
        absl_random_distributions
        absl_random_internal_distribution_test_util
        absl_random_internal_platform
        absl_random_internal_pool_urbg
        absl_random_internal_randen
        absl_random_internal_randen_hwaes
        absl_random_internal_randen_hwaes_impl
        absl_random_internal_randen_slow
        absl_random_internal_seed_material
        absl_random_seed_gen_exception
        absl_random_seed_sequences
        absl_raw_hash_set
        absl_raw_logging_internal
        absl_scoped_set_env
        absl_spinlock_wait
        absl_stacktrace
        absl_status
        absl_statusor
        absl_str_format_internal
        absl_strerror
        absl_string_view
        absl_strings
        absl_strings_internal
        absl_symbolize
        absl_synchronization
        absl_throw_delegate
        absl_time
        absl_time_zone
        utf8_range
        utf8_validity
    )

    # Combine all dependencies into a single static library. Otherwise, we would
    # need to ensure the static libraries listed above are linked in the right
    # order, since they depend on each other.
    #
    # This is done by creating a MRI script for ar

    set(_protobuf_dependencies_lib
        "${CMAKE_CURRENT_BINARY_DIR}/${CMAKE_STATIC_LIBRARY_PREFIX}protobuf_dependencies${CMAKE_STATIC_LIBRARY_SUFFIX}"
    )
    set(_protobuf_dependencies_mri_script
        "${CMAKE_CURRENT_BINARY_DIR}/protobuf_dependencies.mri"
    )

    set(byproducts_local "")
    set(_protobuf_dependencies_fullpaths "")

    # Create MRI script and list of byproducts
    file(WRITE "${_protobuf_dependencies_mri_script}" "create ${_protobuf_dependencies_lib}\n")

    foreach(extra_lib ${_protobuf_dependencies})
        set(extra_lib_subpath "${CMAKE_INSTALL_LIBDIR}/${CMAKE_STATIC_LIBRARY_PREFIX}${extra_lib}${CMAKE_STATIC_LIBRARY_SUFFIX}")

        list(APPEND byproducts_local "<INSTALL_DIR>/${extra_lib_subpath}")

        set(fullpath "${install_dir}/${extra_lib_subpath}")
        list(APPEND _protobuf_dependencies_fullpaths "${fullpath}")

        file(APPEND "${_protobuf_dependencies_mri_script}" "addlib ${fullpath}\n")
    endforeach()

    file(APPEND "${_protobuf_dependencies_mri_script}" "save\n")
    file(APPEND "${_protobuf_dependencies_mri_script}" "end\n")

    set(${byproducts} "${byproducts_local}" PARENT_SCOPE)

    add_custom_command(
        OUTPUT "${_protobuf_dependencies_lib}"
        COMMAND ${CMAKE_AR} -M < ${_protobuf_dependencies_mri_script}
        DEPENDS ${_protobuf_dependencies_fullpaths} ${_protobuf_dependencies_mri_script}
    )
    add_custom_target(${library_name}_combine DEPENDS "${_protobuf_dependencies_lib}")

    add_library(${library_name} STATIC IMPORTED)
    set_target_properties(${library_name} PROPERTIES
        IMPORTED_LOCATION "${_protobuf_dependencies_lib}"
    )
    add_dependencies(${library_name} ${library_name}_combine)
endfunction()
