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

#ifndef ROBOTSELECTIONWIDGET_H
#define ROBOTSELECTIONWIDGET_H

#include "robotwidget.h"
#include "protobuf/command.h"
#include "protobuf/status.h"
#include <QStandardItemModel>

class InputManager;
class ItemDelegate;

namespace Ui {
class RobotSelectionWidget;
}

namespace robot {
class Generation;
class Specs;
}

class RobotSelectionWidget : public QWidget
{
    Q_OBJECT

public:
    struct Generation;
    struct Robot
    {
        uint generation;
        uint id;
    };

public:
    explicit RobotSelectionWidget(QWidget *parent = 0);
    ~RobotSelectionWidget() override;
    RobotSelectionWidget(const RobotSelectionWidget&) = delete;
    RobotSelectionWidget& operator=(const RobotSelectionWidget&) = delete;
    void enableContent(bool enable);
    void resend();
    void setColor(bool blue);

signals:
    void setTeam(uint generation, uint id, RobotWidget::Team team);
    void setInputDevice(uint generation, uint id, const QString &inputDevice);
    void sendCommand(const Command &command);
    void sendRadioResponse(const robot::RadioResponse &response);
    void generationChanged(uint generation, RobotWidget::Team team);
    void setRobotExchangeIcon(uint generation, uint id, bool exchange);
    void sendIsSimulator(bool simulator);

public slots:
    void selectTeam(uint generation, uint id, RobotWidget::Team team);
    void selectTeamForGeneration(uint generation, uint id, RobotWidget::Team team);
    void selectInputDeviceForGeneration(uint generation, const QString &inputDevice);
    void saveConfig();
    void setIsSimulator(bool simulator);
    void selectRobots(const QList<int> &yellow, const QList<int> &blue);

public:
    void init(QWidget *window, InputManager *inputManager);
    void loadRobots();
    void save();
    robot::Specs specs(const QModelIndex &index) const;
    static robot::Specs specs(const robot::Specs &robot, const robot::Specs &def);

private slots:
    void handleStatus(const Status &status);
    void showConfigDialog(const QModelIndex &index);

private:
    void loadRobotsFromGroup(bool simulator);
    void loadRobots(const QString &group, RobotWidget::Team team, bool* hasRobot);
    void saveRobots(const QString &group, RobotWidget::Team team);
    bool validate(const robot::Generation &g);
    robot::Generation loadGeneration(const QString &filename);
    void saveGeneration(const QString &filename, const robot::Generation &generation);
    void sendTeams();
    void sendTeam(robot::Team *t, RobotWidget::Team team);
    void unsetTeam(uint id, uint skip_generation, RobotWidget::Team team);
    void updateGenerationTeam();
    void unsetAll();

private:
    Ui::RobotSelectionWidget *ui;
    QStandardItemModel *m_model;
    QMap<uint, Generation> m_generations;
    ItemDelegate *m_itemDelegate;
    bool m_contentDisabled;
    bool m_isSimulator;
    bool m_isInitialized;
};

#endif // ROBOTSELECTIONWIDGET_H
