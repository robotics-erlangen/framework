/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
 *   Robotics Erlangen e.V.                                                *
 *   http://www.robotics-erlangen.de/                                      *
 *   info@robotics-erlangen.de                                             *
 *                                                                         *
 *   This program is free software: you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation, either version 3 of the License, or     *
 *   any later version.                                                    *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
 ***************************************************************************/

#ifndef COMMON_RADIOCOMMAND2014_H
#define COMMON_RADIOCOMMAND2014_H

#include "radiocommand.h"
#include <stdint.h>

static const uint8_t robot2014_address[] = { 0x40, 0xE8, 0xE4, 0xC7 };
STATIC_ASSERT(sizeof(robot2014_address) == NRF_ADDRESS_SIZE,robot2014_address_has_wrong_size);

static const int16_t RADIOCOMMAND2014_V_MAX = 32767;
static const int16_t RADIOCOMMAND2014_OMEGA_MAX = 32767;
static const int16_t RADIOCOMMAND2014_DELTA_V_MAX = 127;
static const int16_t RADIOCOMMAND2014_DELTA_OMEGA_MAX = 127;
static const uint8_t RADIOCOMMAND2014_KICK_MAX = 255;
static const uint8_t RADIOCOMMAND2014_DRIBBLER_MAX = 100;
static const float RADIOCOMMAND2014_LINEAR_MAX = 10;
static const float RADIOCOMMAND2014_CHIP_MAX = 5;
static const int16_t RADIOCOMMAND2014_INVALID_SPEED = 0x8000;

// WARNING: time slots for reply must be adjusted if the radio command size changes!
typedef struct
{
    uint8_t counter;
    uint8_t shot_power;
    uint8_t chip:1;
    uint8_t charge:1;
    uint8_t standby:1;
    uint8_t id:4;
    uint8_t force_kick:1;
    int8_t dribbler;
    int16_t v_s; // mm/s
    int16_t v_f; // mm/s
    int16_t omega; // mrad/s
    uint8_t ir_param:6;
    uint8_t eject_sdcard:1;
    uint8_t unused:1;
    int16_t cur_v_s; // mm/s
    int16_t cur_v_f; // mm/s
    int16_t cur_omega; // mrad/s
    int8_t delta1_v_s; // mm/s
    int8_t delta1_v_f; // mm/s
    int8_t delta1_omega; // 5 mrad/s
    int8_t delta2_v_s; // mm/s
    int8_t delta2_v_f; // mm/s
    int8_t delta2_omega; // 5 mrad/s
} __attribute__ ((packed)) RadioCommand2014;

enum RadioExtension2014 {
    EXTENSION_BASIC_STATUS,
    EXTENSION_EXTENDED_ERROR,
    EXTENSION_MAX_VALUE
};

typedef struct
{
    uint8_t counter;
    uint8_t id:4;
    uint8_t power_enabled:1;
    uint8_t error_present:1;
    uint8_t ball_detected:1;
    uint8_t cap_charged:1;
    union {
        uint16_t unused; // set to zero, in not all bits are written!
        struct { // BasicStatus
            uint8_t battery;
            uint8_t packet_loss;
        } __attribute__ ((packed));
        struct { // ExtendedError
            uint8_t motor_1_error:1;
            uint8_t motor_2_error:1;
            uint8_t motor_3_error:1;
            uint8_t motor_4_error:1;
            uint8_t dribler_error:1;
            uint8_t kicker_error:1;
            uint8_t kicker_break_beam_error:1;
            uint8_t motor_encoder_error:1;
            uint8_t main_sensor_error:1;
            uint8_t temperature:7;
        } __attribute__ ((packed));
    } __attribute__ ((packed));
    uint32_t extension_id:4;
    // valid if main_active
    int32_t v_s:14; // mm/s
    int32_t v_f:14; // mm/s
    int16_t omega; // mrad/s
} __attribute__ ((packed)) RadioResponse2014;

typedef struct
{
    uint8_t counter;
    int16_t time_offset; // microseconds
} __attribute__ ((packed)) RadioSync2014;

#endif // COMMON_RADIOCOMMAND2014_H
