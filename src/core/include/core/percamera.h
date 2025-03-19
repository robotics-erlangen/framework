/***************************************************************************
 *   Copyright 2025 Paul Bergmann                                          *
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

#ifndef PERCAMERA_H
#define PERCAMERA_H

#include "protobuf/ssl_vision/ssl_detection.pb.h"
#include <QtGlobal>
#include <array>
#include <cstdint>

/*! \brief A class that stores per-SSL-camera data. */
template<typename T>
class PerCamera
{
public:
    /*! \brief The maximum number of cameras, as mandated by the SSL-Vision. */
    static constexpr std::size_t MAX_CAMERAS = 8;

    PerCamera() = default;

    const T& at(uint32_t camera) const {
        if (Q_UNLIKELY(camera < 0 || camera >= MAX_CAMERAS)) {
            qFatal("PerCamera: Camera ID out of range: %d", camera);
        }
        return m_data[camera];
    }

    T& at(uint32_t camera) {
        if (Q_UNLIKELY(camera < 0 || camera >= MAX_CAMERAS)) {
            qFatal("PerCamera: Camera ID out of range: %d", camera);
        }
        return m_data[camera];
    }

    const T& operator[](uint32_t camera) const { return at(camera); }
    T& operator[](uint32_t camera) { return at(camera); }

    const T& operator[](const SSL_DetectionFrame& frame) const { return at(frame.camera_id()); }
    T& operator[](const SSL_DetectionFrame& frame) { return at(frame.camera_id()); }

private:
    /*! \brief The data for each camera.
     *
     * Can be an array, since both SSL-Vision and the vision-processor enforce
     * camera IDs to be in the range [0, 7]
     */
    std::array<T, MAX_CAMERAS> m_data;

};

#endif // PERCAMERA_H
