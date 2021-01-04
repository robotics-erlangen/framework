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

#ifndef REPLAYTEAMWIDGET_H
#define REPLAYTEAMWIDGET_H

#include <QWidget>
#include <QStringList>
#include <memory>
#include "protobuf/status.h"
#include "protobuf/command.h"

namespace Ui {
class ReplayTeamWidget;
}

class ReplayTeamWidget : public QWidget
{
    Q_OBJECT

public:
    explicit ReplayTeamWidget(QWidget *parent = 0);
    ~ReplayTeamWidget();
    ReplayTeamWidget(const ReplayTeamWidget&) = delete;
    ReplayTeamWidget& operator=(const ReplayTeamWidget&) = delete;
    void setRecentScriptList(const std::shared_ptr<QStringList> &list);

signals:
    void gotStatus(const Status & status);
    void sendCommand(const Command &command);
    void setRegularVisualizationsEnabled(bool blue, bool enabled);
    void sendResetDebugPacket(bool blue);
    void setUseDarkColors(bool useDark);

private slots:
    void strategyBlueEnabled(bool enabled);
    void strategyYellowEnabled(bool enabled);
    void trackingReplayChanged(bool enabled);

private:
    Ui::ReplayTeamWidget *ui;
};

#endif // REPLAYTEAMWIDGET_H
