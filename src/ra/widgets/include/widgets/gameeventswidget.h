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

#ifndef GAMEEVENTSWIDGET_H
#define GAMEEVENTSWIDGET_H

#include <QDockWidget>

#include "protobuf/status.h"

namespace Ui {
class GameEventsWidget;
}

class GameEventsWidget : public QWidget
{
    Q_OBJECT

public:
    explicit GameEventsWidget(QWidget *parent = nullptr);
    ~GameEventsWidget();

public slots:
    void handleStatus(const Status &status);

private:
    Ui::GameEventsWidget *ui;
};

#endif // GAMEEVENTSWIDGET_H
