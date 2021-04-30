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

#include "refereeinfowidget.h"
#include "ui_refereeinfowidget.h"
#include "config/config.h"

RefereeInfoWidget::RefereeInfoWidget(QWidget *parent) :
    QWidget(parent), ui(new Ui::RefereeInfoWidget)
{
    ui->setupUi(this);
    setStyleSheets(false);
}

RefereeInfoWidget::~RefereeInfoWidget()
{
    delete ui;
}

void RefereeInfoWidget::handleStatus(const Status &status)
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

    if (status->has_geometry()) {
        const auto& geometry = status->geometry();
        if (geometry.has_division()) {
            const QString divisionString = "Division: ";
            switch (geometry.division()) {
                case world::Geometry_Division_A:
                    ui->divisionLabel->setText(divisionString + "A");
                    break;
                case world::Geometry_Division_B:
                    ui->divisionLabel->setText(divisionString + "B");
                    break;
                default:
                    ui->divisionLabel->setText("DIVISION ERROR");
            }
        }
    }
}

QString RefereeInfoWidget::createStyleSheet(const QColor &color)
{
    const QString f("QLabel { background-color: %1; border: 1px solid %2; border-radius: 3px; }");
    return f.arg(color.lighter(180).name(), color.darker(140).name());
}

void RefereeInfoWidget::setStyleSheets(bool useDark) {
    QString yellow, blue;
    if (useDark) {
        yellow = createStyleSheet(UI_YELLOW_COLOR_DARK);
        blue = createStyleSheet(UI_BLUE_COLOR_DARK);
    } else {
        yellow = createStyleSheet(UI_YELLOW_COLOR_LIGHT);
        blue = createStyleSheet(UI_BLUE_COLOR_LIGHT);
    }
    ui->keeperIdBlue->setStyleSheet(blue);
    ui->keeperTextLabelBlue->setStyleSheet(blue);
    ui->numberOfCardsBlue->setStyleSheet(blue);
    ui->cardTextLabelBlue->setStyleSheet(blue);

    ui->keeperIdYellow->setStyleSheet(yellow);
    ui->keeperTextLabelYellow->setStyleSheet(yellow);
    ui->numberOfCardsYellow->setStyleSheet(yellow);
    ui->cardTextLabelYellow->setStyleSheet(yellow);
}
