/***************************************************************************
 *   Copyright 2022 Michel Schmid
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

#ifndef GITINFODIALOG_H
#define GITINFODIALOG_H

#include "protobuf/status.h"
#include "protobuf/command.h"
#include <QDialog>

namespace Ui {
class GitInfoDialog;
}

class GitInfoDialog : public QDialog
{
    Q_OBJECT

public:
    explicit GitInfoDialog(QWidget *parent = nullptr);
    ~GitInfoDialog();

public slots:
    void handleStatus(const Status &status);
    void handleCommand(const Command &status);

private:
    Ui::GitInfoDialog *ui;
    bool m_logHasGitInfo = false;
    bool m_logCanResetGitInfo = true;
};

#endif // GITINFODIALOG_H
