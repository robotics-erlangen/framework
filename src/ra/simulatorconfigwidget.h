/***************************************************************************
 *   Copyright 2020 Philipp Nordhus, Andreas Wendler                       *
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

#ifndef SIMULATORCONFIGWIDGET_H
#define SIMULATORCONFIGWIDGET_H

#include "protobuf/command.h"
#include <QWidget>

namespace Ui {
    class SimulatorConfigWidget;
}

class SimulatorConfigWidget : public QWidget
{
    Q_OBJECT

public:
    explicit SimulatorConfigWidget(QWidget *parent = 0);
    ~SimulatorConfigWidget() override;
    SimulatorConfigWidget(const SimulatorConfigWidget&) = delete;
    SimulatorConfigWidget& operator=(const SimulatorConfigWidget&) = delete;

    void load();

public slots:
    void save();
    void sendAll();

signals:
    void sendCommand(const Command &command);

private slots:
    void realismPresetChanged(QString name);

private:
    Ui::SimulatorConfigWidget *ui;
};

#endif // SIMULATORCONFIGWIDGET_H
