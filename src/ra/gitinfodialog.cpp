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

#include "gitinfodialog.h"
#include "ui_gitinfodialog.h"

GitInfoDialog::GitInfoDialog(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::GitInfoDialog)
{
    ui->setupUi(this);
}

void GitInfoDialog::handleStatus(const Status& status)
{
    if (status->has_git_info()) {
        const auto gitInfo = status->git_info();

        GitInfoWidget* infoWidget;
        switch (gitInfo.kind()) {
            case amun::GitInfo_Kind_BLUE: {
                infoWidget = ui->strategyBlueDiff;
                break;
            }
            case amun::GitInfo_Kind_YELLOW: {
                infoWidget = ui->strategyYellowDiff;
                break;
            }
            case amun::GitInfo_Kind_AUTOREF: {
                infoWidget = ui->autorefDiff;
                break;
            }
            default: {
                std::cerr << "Received git info for unknown source!" << std::endl;
                return;
            }
        }
        infoWidget->updateGitInfo(gitInfo.hash(), gitInfo.diff(), gitInfo.min_hash(), gitInfo.error());
    }
}

GitInfoDialog::~GitInfoDialog()
{
    delete ui;
}
