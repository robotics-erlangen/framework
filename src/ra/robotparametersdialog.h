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

#ifndef ROBOTPARAMETERSDIALOG_H
#define ROBOTPARAMETERSDIALOG_H

#include "protobuf/command.h"
#include <QDialog>

namespace Ui {
    class RobotParametersDialog;
}

class RobotParametersDialog : public QDialog
{
    Q_OBJECT

public:
    explicit RobotParametersDialog(QWidget *parent = 0);
    ~RobotParametersDialog() override;

signals:
    void sendCommand(const Command &command);

private slots:
    void send();

private:
    Ui::RobotParametersDialog *ui;
};

#endif // ROBOTPARAMETERSDIALOG_H
