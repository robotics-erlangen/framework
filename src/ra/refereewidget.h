/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef REFEREEWIDGET_H
#define REFEREEWIDGET_H

#include "protobuf/command.h"
#include "protobuf/ssl_referee.pb.h"
#include "protobuf/status.h"
#include <memory>
#include <QStringList>
#include <QWidget>

namespace Ui {
    class RefereeWidget;
}

class RefereeWidget : public QWidget
{
    Q_OBJECT

public:
    explicit RefereeWidget(QWidget *parent = 0);
    ~RefereeWidget() override;
    RefereeWidget(const RefereeWidget&) = delete;
    RefereeWidget& operator=(const RefereeWidget&) = delete;
    void load();
    void shutdownInternalAutoref();
    void forceAutoReload(bool force);
    void setStyleSheets(bool useDark);

signals:
    void changeCommand(SSL_Referee::Command command);
    void changeStage(SSL_Referee::Stage stage);
    void changeYellowKeeper(uint id);
    void changeBlueKeeper(uint id);
    void enableInternalAutoref(bool enable);
    void changeSidesFlipped(bool flipped);
    void sendCommand(const Command& command);
    void sendYellowCard(int forTeamYellow);
    void sendDivisionChange(world::Geometry::Division division);

public slots:
    void handleStatus(const Status &status);
    void saveConfig();
    void enableNumberShortcuts(bool enable);

private slots:
    void handleCommand();
    void handleStage(int index);
    void handleYellowKeeper(int id);
    void handleBlueKeeper(int id);
    void divisionChanged(QString division);
    void handleAutomaticRobotExchangeChanged(bool enable);

private:
    void registerCommand(QWidget *button, SSL_Referee::Command c, const QString &stylesheet);
    static QString createStyleSheet(const QColor &color);

private:
    Ui::RefereeWidget *ui;
    uint m_yellowKeeperId;
    uint m_blueKeeperId;
    SSL_Referee::Stage m_stage;

    std::shared_ptr<QStringList> m_recentScripts;

    bool m_newDivisionDetected = false;
    world::Geometry::Division m_currentDivision = world::Geometry_Division_A;
};

#endif // REFEREEWIDGET_H
