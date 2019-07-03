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

#ifndef REFEREESTATUSWIDGET_H
#define REFEREESTATUSWIDGET_H

#include "protobuf/status.h"

#include <QWidget>
#include <QString>

namespace Ui {
class RefereeStatusWidget;
}

class RefereeStatusWidget : public QWidget
{
    Q_OBJECT

public:
    explicit RefereeStatusWidget(QWidget *parent = 0);
    ~RefereeStatusWidget() override;
    RefereeStatusWidget(const RefereeStatusWidget&) = delete;
    RefereeStatusWidget& operator=(const RefereeStatusWidget&) = delete;

public slots:
    void handleStatus(const Status &status);

public:
    static QString gameEvent2019Message(const gameController::GameEvent &event);

private:
    QString formatTime(int time);
    QString gameEventMessage(const SSL_Referee_Game_Event &event);

private:
    Ui::RefereeStatusWidget *ui;
};

#endif // REFEREESTATUSWIDGET_H
