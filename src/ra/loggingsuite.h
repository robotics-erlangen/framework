/***************************************************************************
 *   Copyright 2020 Michael Eischer, Tobias Heineken, Philipp Nordhus      *
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

#ifndef LOGSUITE_H
#define LOGSUITE_H

#include <QObject>
#include "protobuf/status.h"
#include "protobuf/command.h"
#include <QAction>

class Logsuite: public QObject {
    Q_OBJECT

public:
    Logsuite(QAction* logAction, QAction* backlogMenu, QAction* backlogButton, bool isReplay, QObject* parent = nullptr);
    QAction* getLogAction() { return m_logAction; }

public slots:
    void handleStatus(const Status &status);

signals:
    void isLogging(bool logging);
    void sendCommand(const Command& command);

private slots:
    void triggeredBacklog();
    void triggeredLog(bool enable);

private:
    QAction* m_logAction;
    QAction* m_backlogActionMenu;
    QAction* m_backlogButton;
    bool m_isReplay;
};

#endif
