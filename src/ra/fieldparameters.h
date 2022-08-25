/***************************************************************************
 *   Copyright 2022 Andreas Wendler                                        *
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

#ifndef FIELDPARAMETERS_H
#define FIELDPARAMETERS_H

#include <QWidget>

#include "protobuf/status.h"
#include "protobuf/command.h"
#include "protobuf/world.pb.h"

namespace Ui {
class FieldSetup;
}

class FieldParameters : public QWidget
{
    Q_OBJECT

public:
    explicit FieldParameters(QWidget *parent = nullptr);
    ~FieldParameters();

signals:
    void sendCommand(const Command &command);

public slots:
    void handleStatus(const Status &status);

private slots:
    void updateParameters();
    void useVisionParameters();

private:
    world::BallModel getModel() const;
    void applyModel(const world::BallModel &model);

private:
    Ui::FieldSetup *ui;

    world::BallModel m_visionBallModel;
    bool m_preventUpdate = false;
};

#endif // FIELDPARAMETERS_H
