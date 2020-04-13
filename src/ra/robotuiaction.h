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

#ifndef ROBOTUIACTION_H
#define ROBOTUIACTION_H

#include <QObject>

enum class FieldWidgetAction {
    None = 0,
    ToggleVisualization = 1,
    SetDebugSearch = 2
};

class RobotUIAction : public QObject
{
    Q_OBJECT
public:
    explicit RobotUIAction(QObject *parent = nullptr);

signals:
    void setDebugFilterString(QString filter);
    void toggleVisualization(QString regexMatch);

public slots:
    void actionInvoced(bool teamIsBlue, int robotId);
    void setActionType(FieldWidgetAction action, QString searchString);

private:
    FieldWidgetAction m_action = FieldWidgetAction::None;
    QString m_searchString;

};

#endif // ROBOTUIACTION_H
