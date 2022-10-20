/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#ifndef DEBUGWIDGET_H
#define DEBUGWIDGET_H

#include <QWidget>

#include "protobuf/status.h"

namespace Ui {
class DebugWidget;
}

class DebugWidget : public QWidget
{
    Q_OBJECT

public:
    explicit DebugWidget(QWidget *parent = 0);
    ~DebugWidget();
    DebugWidget(const DebugWidget&) = delete;
    DebugWidget& operator=(const DebugWidget&) = delete;

public slots:
    void clearData();
    void setFilter(const QString &filter); // for setting the filter externally

private slots:
    void handleStatus(const Status &status);
    void filterChanged(const QString &filter);

signals:
    void triggerBreakpoint();

private:
    Ui::DebugWidget *ui;
    QString m_filterDefaultStyleSheet;
};

#endif // DEBUGWIDGET_H
