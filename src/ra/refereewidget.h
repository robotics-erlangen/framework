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
#include "protobuf/status.h"
#include "protobuf/ssl_referee.pb.h"
#include <QWidget>

namespace Ui {
    class RefereeWidget;
}

class RefereeWidget : public QWidget
{
    Q_OBJECT

public:
    RefereeWidget(QWidget *parent = 0);
    ~RefereeWidget();

signals:
    void changeCommand(SSL_Referee::Command command);
    void changeStage(SSL_Referee::Stage stage);
    void changeYellowKeeper(uint id);
    void changeBlueKeeper(uint id);

public slots:
    void handleStatus(const Status &status);

private slots:
    void handleCommand();
    void handleStage(int index);
    void handleYellowKeeper(int id);
    void handleBlueKeeper(int id);

private:
    void registerCommand(QWidget *button, SSL_Referee::Command c, const QString &stylesheet);
    static QString createStyleSheet(const QColor &color);

private:
    Ui::RefereeWidget *ui;
    uint m_yellowKeeperId;
    uint m_blueKeeperId;
    SSL_Referee::Stage m_stage;
};

#endif // REFEREEWIDGET_H
