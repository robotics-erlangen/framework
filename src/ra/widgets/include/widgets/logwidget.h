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

#ifndef LOGWIDGET_H
#define LOGWIDGET_H

#include <QPlainTextEdit>
#include <QContiguousCache>
#include "protobuf/status.h"

class LogWidget : public QPlainTextEdit
{
    Q_OBJECT
public:
    explicit LogWidget(QWidget *parent = 0);
    void hideLogToggles();

public slots:
    void handleStatus(const Status &status);

protected:
    void contextMenuEvent(QContextMenuEvent *event) override;

private slots:
    void setLogVisibility(bool visible);

private:
    QString fromTime(qint64 time, QString prefix);

private:
    QContiguousCache<qint64> m_lastTimes;
    qint64 m_lastDate;
    bool m_hideLogToggles;
    bool m_logBlueStrategy;
    bool m_logBlueReplayStrategy;
    bool m_logYellowStrategy;
    bool m_logYellowReplayStrategy;
    bool m_logAutoref;
    QList<QString> m_lastAutorefOutput;
};

#endif // LOGWIDGET_H
