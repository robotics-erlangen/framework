/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#ifndef OPTIONSMANAGER_H
#define OPTIONSMANAGER_H

#include <QObject>
#include <QMap>
#include <string>

#include "protobuf/command.h"
#include "protobuf/status.h"

class OptionsManager : public QObject
{
    Q_OBJECT
public:
    OptionsManager(QObject *parent = nullptr);

public slots:
    void handleStatus(const Status &status);
    void handleCommand(const Command &command);

signals:
    void sendStatus(const Status &status);

private:
    void handleStrategyStatus(const amun::StatusStrategy &strategy);
    void sendOptions();

private:
    QMap<std::string, bool> m_currentOptions;
};

#endif // OPTIONSMANAGER_H
