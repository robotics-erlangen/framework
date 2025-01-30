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

#ifndef WORLDPARAMETERS_H
#define WORLDPARAMETERS_H

#include "core/fieldtransform.h"
#include "protobuf/command.pb.h"
#include "protobuf/debug.pb.h"
#include "protobuf/world.pb.h"
#include <QList>
#include <QMap>
#include <QObject>
#include <QString>
#include <optional>

class SSL_GeometryCameraCalibration;
class SSL_GeometryData;

class WorldParameters : public QObject
{
    Q_OBJECT

public:
    explicit WorldParameters(bool simulatorEnabled, bool isReplay);

    const FieldTransform &fieldTransform() const { return m_fieldTransform; }
    void setFlip(bool flip) { m_fieldTransform.setFlip(flip); }

    void reset();
    void handleCommand(const amun::CommandTracking &command, bool simulatorEnabled);
    void handleVisionGeometry(const SSL_GeometryData &geometry, const QString &sender);

    bool injectDebugValues(qint64 currentTime, amun::DebugValues* debug);
    void clearDebugData();

    std::optional<world::Geometry> getGeometryUpdate() const;

    /*! \brief Call this after all calls to getGeometryUpdate for one frame */
    void finishProcessing() {
        m_geometryUpdated = false;
    }
signals:
    void cameraUpdated(const SSL_GeometryCameraCalibration &c, const QString &sender);
    void ballModelUpdated(const world::BallModel &ballModel);

private:
    void handleVisionCamera(const SSL_GeometryCameraCalibration &c, const QString &sender);

private:
    QList<QString> m_errorMessages;

    FieldTransform m_fieldTransform;

    QMap<int, QString> m_cameraSender;

    bool m_simulatorEnabled = false;

    world::Geometry m_geometry;
    world::Geometry m_virtualFieldGeometry;
    world::BallModel m_ballModel;
    bool m_geometryUpdated = false;
    bool m_ballModelUpdated = true;
    const bool m_saveBallModel = false;
    bool m_virtualFieldEnabled = false;
};


#endif // WORLDPARAMETERS_H
