/***************************************************************************
 *   Copyright 2020 Michel Schmid
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

#include "teaminfowidget.h"
#include "ui_teaminfowidget.h"

TeamInfoWidget::TeamInfoWidget(QWidget *parent) :
    QWidget(parent), ui(new Ui::TeaminfoWidget)
{
    ui->setupUi(this);
}

TeamInfoWidget::~TeamInfoWidget()
{
    delete ui;
}

void TeamInfoWidget::handleStatus(const Status &status)
{
    if (status->has_game_state()) {
        const amun::GameState &state = status->game_state();

        const uint yellowKeeperId = state.yellow().goalie();
        const uint blueKeeperId = state.blue().goalie();
        const uint yellowYellowCards = state.yellow().yellow_cards();
        const uint blueYellowCards = state.blue().yellow_cards();

        if (yellowKeeperId != m_yellowKeeperId) {
            m_yellowKeeperId = yellowKeeperId;
            ui->keeperIdYellow->setNum(static_cast<int>(m_yellowKeeperId));
        }
        if (blueKeeperId != m_blueKeeperId) {
            m_blueKeeperId = blueKeeperId;
            ui->keeperIdBlue->setNum(static_cast<int>(m_blueKeeperId));
        }

        if (yellowYellowCards != m_yellowYellowCards) {
            m_yellowYellowCards = yellowYellowCards;
            ui->numberOfCardsYellow->setNum(static_cast<int>(m_yellowYellowCards));
        }
        if (state.yellow().yellow_card_times_size() > 0) {
            m_yellowTimerZero = false;
            ui->timeLeftOnYellowCardYellow->setValue(state.yellow().yellow_card_times(0)/1E6);
        } else if (!m_yellowTimerZero) {
            m_yellowTimerZero = true;
            ui->timeLeftOnYellowCardYellow->setValue(0);
        }


        if (blueYellowCards != m_blueYellowCards) {
            m_blueYellowCards = blueYellowCards;
            ui->numberOfCardsBlue->setNum(static_cast<int>(m_blueYellowCards));
        }
        if (state.blue().yellow_card_times_size() > 0) {
            m_blueTimerZero = false;
            ui->timeLeftOnYellowCardBlue->setValue(state.blue().yellow_card_times(0)/1E6);
        } else if (!m_blueTimerZero) {
            m_blueTimerZero = true;
            ui->timeLeftOnYellowCardBlue->setValue(0);
        }
    }
}
