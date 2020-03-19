/***************************************************************************
 *   Copyright 2020 Tobias Heineken, Andreas Wendler                       *
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
#ifndef RALOGLABEL_H
#define RALOGLABEL_H

#include "protobuf/status.pb.h"
#include <QLabel>
#include <QString>

class LogLabel: public QLabel {
    Q_OBJECT

public slots:
//    void handleStatus(const Status &status); //TODO: to be implemented as soon as UiResponse is used via status
    void handleUiResponse(amun::UiResponse response, qint64 time);

private:
    qint64 m_logStartTime;
    QString m_lastLogTimeLabel;
};
#endif
