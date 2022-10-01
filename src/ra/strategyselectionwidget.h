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

#ifndef STRATEGYSELECTIONWIDGET_H
#define STRATEGYSELECTIONWIDGET_H

#include "protobuf/command.h"

#include <QWidget>

namespace Ui {
class StrategySelectionWidget;
}

class StrategySelectionWidget : public QWidget
{
    Q_OBJECT

public:
    explicit StrategySelectionWidget(QWidget *parent = nullptr);
    ~StrategySelectionWidget();

    void shutdown();
    void enableContent(bool enable);
    void init(QWidget *window);
    void loadStrategies();
    void forceAutoReload(bool force);
    std::shared_ptr<QStringList> recentScriptsList() const { return m_recentScripts; }

public slots:
    void saveConfig(bool saveTeams = true);

signals:
    void sendCommand(const Command &command);
    void setUseDarkColors(bool useDark);

private:
    Ui::StrategySelectionWidget *ui;

    std::shared_ptr<QStringList> m_recentScripts;
    bool m_contentDisabled;
    bool m_isInitialized;
};

#endif // STRATEGYSELECTIONWIDGET_H
