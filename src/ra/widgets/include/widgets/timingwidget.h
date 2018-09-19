/***************************************************************************
 *   Copyright 2015 Philipp Nordhus                                        *
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

#ifndef TIMINGWIDGET_H
#define TIMINGWIDGET_H

#include "protobuf/status.h"
#include <QStandardItemModel>
#include <QWidget>

namespace Ui {
class TimingWidget;
}

class TimingWidget : public QWidget
{
    Q_OBJECT

public:
    explicit TimingWidget(QWidget *parent = 0);
    ~TimingWidget() override;
    TimingWidget(const TimingWidget&) = delete;
    TimingWidget& operator=(const TimingWidget&) = delete;

public slots:
    void handleStatus(const Status &status);
    void saveConfig();

private slots:
    void updateModel();

private:
    struct Value
    {
        Value() : time(0.0f), iterations(0) {}
        float time;
        int iterations;
    };

    Ui::TimingWidget *ui;
    QStandardItemModel *m_model;
    QMap<int, Value> m_values;
};

#endif // TIMINGWIDGET_H
