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

#include "worldparameters.h"

#include "core/configuration.h"
#include "core/fieldtransform.h"
#include "protobuf/command.pb.h"
#include "protobuf/geometry.h"
#include "protobuf/ssl_geometry.pb.h"
#include <QObject>
#include <QString>
#include <utility>

static QString SIMULATOR_BALL_MODEL_CONFIG = "field-properties/simulator";
static QString FIELD_BALL_MODEL_CONFIG = "field-properties/field";

static const QString& ballModelConfigFile(bool isSimulator)
{
    return isSimulator ? SIMULATOR_BALL_MODEL_CONFIG : FIELD_BALL_MODEL_CONFIG;
}

WorldParameters::WorldParameters(bool simulatorEnabled, bool isReplay) :
    QObject(),
    m_simulatorEnabled(simulatorEnabled),
    m_saveBallModel(!isReplay)
{
    geometrySetDefault(&m_geometry, true);
    geometrySetDefault(&m_virtualFieldGeometry, true);

    loadConfiguration(ballModelConfigFile(simulatorEnabled), &m_ballModel, false);
}

void WorldParameters::reset()
{
    m_cameraSender.clear();
}

void WorldParameters::handleCommand(const amun::CommandTracking &command, bool simulatorEnabled)
{
    const bool simulatorEnabledBefore = m_simulatorEnabled;
    m_simulatorEnabled = simulatorEnabled;

    if (command.has_field_transform()) {
        const auto &tr = command.field_transform();
        std::array<float, 6> transform({tr.a11(), tr.a12(), tr.a21(), tr.a22(), tr.offsetx(), tr.offsety()});
        m_fieldTransform.setTransform(transform);
    }

    if (command.has_enable_virtual_field()) {
        // reset transform
        if (!command.enable_virtual_field()) {
            m_fieldTransform.resetTransform();
        }

        m_virtualFieldEnabled = command.enable_virtual_field();
        m_geometryUpdated = true;
    }

    if (command.has_virtual_geometry()) {
        m_virtualFieldGeometry.CopyFrom(command.virtual_geometry());
        m_geometryUpdated = true;
    }

    if (command.has_ball_model()) {
        m_ballModel.CopyFrom(command.ball_model());

        if (m_saveBallModel) {
            saveConfiguration(ballModelConfigFile(m_simulatorEnabled), &m_ballModel);
        }

        m_ballModelUpdated = true;
    }

    if (simulatorEnabledBefore != m_simulatorEnabled) {
        loadConfiguration(ballModelConfigFile(m_simulatorEnabled), &m_ballModel, false);
        m_ballModelUpdated = true;
    }

    if (m_ballModelUpdated) {
        emit ballModelUpdated(m_ballModel);
    }
}

void WorldParameters::handleVisionGeometry(const SSL_GeometryData &geometry, const QString &sender)
{
    convertFromSSlGeometry(geometry.field(), m_geometry);
    m_geometryUpdated = true;

    for (int i = 0; i < geometry.calib_size(); i++) {
        handleVisionCamera(geometry.calib(i), sender);
    }
}

bool WorldParameters::injectDebugValues(qint64 currentTime, amun::DebugValues* debug)
{
    for (const QString &message : m_errorMessages) {
        amun::StatusLog *log = debug->add_log();
        log->set_timestamp(currentTime);
        log->set_text(message.toStdString());
    }

    return m_errorMessages.size() > 0;
}

void WorldParameters::clearDebugData()
{
    m_errorMessages.clear();
}

std::optional<world::Geometry> WorldParameters::getGeometryUpdate() const
{
    if (!m_geometryUpdated && !m_ballModelUpdated) {
        return std::nullopt;
    }

    world::Geometry geometry;
    geometry.CopyFrom(m_virtualFieldEnabled ? m_virtualFieldGeometry : m_geometry);

    geometry.mutable_ball_model()->CopyFrom(m_ballModel);

    return std::make_optional(geometry);
}

void WorldParameters::handleVisionCamera(const SSL_GeometryCameraCalibration &c, const QString &sender)
{
    if (auto lastSender = m_cameraSender.find(c.camera_id());
            lastSender != m_cameraSender.end() && *lastSender != sender) {
        m_errorMessages.append(
            QString("<font color=\"red\">WARNING: </font> camera %1 is being sent from "
                    "two different vision sources: %2 and %3!")
            .arg(c.camera_id())
            .arg(*lastSender)
            .arg(sender));
    }
    m_cameraSender.insert(c.camera_id(), sender);

    emit cameraUpdated(c, sender);
}
