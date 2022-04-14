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
    if (status->has_status_strategy()) {
        const auto strategyStatusWrapper = status->status_strategy();

        const auto strategyStatus = strategyStatusWrapper.status();
        GitInfoWidget* infoWidget;
        if (strategyStatus.has_git_hash()) {
            switch (strategyStatusWrapper.type()) {
                case amun::StatusStrategyWrapper::StrategyType::StatusStrategyWrapper_StrategyType_BLUE: {
                    infoWidget = ui->strategyBlueDiff;
                    break;
                }
                case amun::StatusStrategyWrapper::StrategyType::StatusStrategyWrapper_StrategyType_YELLOW: {
                    infoWidget = ui->strategyYellowDiff;
                    break;
                }
                case amun::StatusStrategyWrapper::StrategyType::StatusStrategyWrapper_StrategyType_AUTOREF: {
                    infoWidget = ui->autorefDiff;
                    break;
                }
                case amun::StatusStrategyWrapper::StrategyType::StatusStrategyWrapper_StrategyType_REPLAY_BLUE: {
                    std::cerr << "Received git info for replay blue!" << std::endl;
                    return;
                }
                case amun::StatusStrategyWrapper::StrategyType::StatusStrategyWrapper_StrategyType_REPLAY_YELLOW: {
                    std::cerr << "Received git info for replay yellow!" << std::endl;
                    return;
                }
                default: {
                    std::cerr << "Received git info for unknown source!" << std::endl;
                    return;
                }
            }
            infoWidget->setGitHash(QString::fromStdString(strategyStatus.git_hash()));
            infoWidget->setGitDiff(QString::fromStdString(strategyStatus.git_diff()));
        }
    }
}

GitInfoDialog::~GitInfoDialog()
{
    delete ui;
}
