/***************************************************************************
 *   Copyright 2025 Andreas Wendler                                        *
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

#ifndef GAMEEVENTCOLLECTOR_H
#define GAMEEVENTCOLLECTOR_H

#include <QObject>

#include "protobuf/status.h"

class StatusSource;

class GameEventCollector : public QObject
{
    Q_OBJECT

public:
    GameEventCollector(const std::shared_ptr<StatusSource>& source, int32_t scanId);

signals:
    void sendUi(const Status& status);
    void finished();

public slots:
    void process();

private:
    using GameEventList = std::vector<std::pair<uint32_t, gameController::GameEvent>>;

    void sendProgress(int currentPacket, const GameEventList& events);

private:
    std::shared_ptr<StatusSource> m_statusSource;
    int32_t m_scanId;
};

#endif // GAMEEVENTCOLLECTOR_H