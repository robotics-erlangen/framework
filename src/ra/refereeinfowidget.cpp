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

    ui->keeperIdYellow->setNum(static_cast<int>(m_yellowKeeperId));
    ui->keeperIdBlue->setNum(static_cast<int>(m_blueKeeperId));
}

RefereeInfoWidget::~RefereeInfoWidget()
{
    delete ui;
}

std::pair<int, int> RefereeInfoWidget::computeRobotsInField(const world::State& worldState) const {
    if (!m_substitutionAreaInfo.has_value()) {
        return { worldState.blue_size(), worldState.yellow_size() };
    }
    const auto substitutionAreaY = *m_substitutionAreaInfo;
    const auto numBlueBots = std::ranges::count_if(worldState.blue(), [&] (const auto &robot) { return robot.p_y() < substitutionAreaY; });
    const auto numYellowBots = std::ranges::count_if(worldState.yellow(), [&] (const auto &robot) { return robot.p_y() > -substitutionAreaY; });
    return { numBlueBots, numYellowBots };
}

void RefereeInfoWidget::handleStatus(const Status &status)
{
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

        if (geometry.has_goal_substitution_area_width()) {
            m_substitutionAreaInfo = geometry.field_height() * 0.5
                                            + geometry.boundary_width_goal_line()
                                            - geometry.goal_substitution_area_width();
        } else {
            m_substitutionAreaInfo.reset();
        }
    }

    bool currentRobotCountChanged = false;
    if (status->has_game_state()) {
        const amun::GameState &state = status->game_state();

        const uint yellowKeeperId = state.yellow().goalie();
        const uint blueKeeperId = state.blue().goalie();
        const uint yellowYellowCards = state.yellow().yellow_card_times_size();
        const uint blueYellowCards = state.blue().yellow_card_times_size();
        const uint yellowRedCards = state.yellow().red_cards();
        const uint blueRedCards = state.blue().red_cards();
        const uint yellowFouls = state.yellow().foul_counter();
        const uint blueFouls = state.blue().foul_counter();

        const int allowedRobotsYellow = state.yellow().has_max_allowed_bots() ? state.yellow().max_allowed_bots() : m_allowedRobotCountBlue;
        const int allowedRobotsBlue = state.blue().has_max_allowed_bots() ? state.blue().max_allowed_bots() : m_allowedRobotCountBlue;

        currentRobotCountChanged |= allowedRobotsYellow != m_allowedRobotCountYellow;
        currentRobotCountChanged |= allowedRobotsBlue != m_allowedRobotCountBlue;
        m_allowedRobotCountYellow = allowedRobotsYellow;
        m_allowedRobotCountBlue = allowedRobotsBlue;

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
        if (yellowRedCards != m_yellowRedCards) {
            m_yellowRedCards = yellowRedCards;
            ui->redCardCountYellow->setNum(static_cast<int>(m_yellowRedCards));
        }
        if (yellowFouls != m_yellowFouls) {
            m_yellowFouls = yellowFouls;
            ui->foulCounterYellow->setNum(static_cast<int>(m_yellowFouls));
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
        if (blueRedCards != m_blueRedCards) {
            m_blueRedCards = blueRedCards;
            ui->redCardCountBlue->setNum(static_cast<int>(m_blueRedCards));
        }
        if (blueFouls != m_blueFouls) {
            m_blueFouls = blueFouls;
            ui->foulCounterBlue->setNum(static_cast<int>(m_blueFouls));
        }

        auto setBallPlacementFailuresReached = [](bool &bufferedReached, bool hasReached, QLabel *label) {
            if (bufferedReached != hasReached) {
                bufferedReached = hasReached;
                label->setText(hasReached ? "Placement X:" : "Placement:");
            }
        };
        if (state.yellow().has_ball_placement_failures_reached()) {
            setBallPlacementFailuresReached(
                m_yellowPlacementFailuresReached,
                state.yellow().ball_placement_failures_reached(),
                ui->placementFailuresLabelYellow);
        }
        if (state.blue().has_ball_placement_failures_reached()) {
            setBallPlacementFailuresReached(
                m_bluePlacementFailuresReached,
                state.blue().ball_placement_failures_reached(),
                ui->placementFailuresLabelBlue);
        }

        auto setBallPlacementFailures  = [](uint &bufferedFailures, uint failures, QLabel *label) {
            if (bufferedFailures != failures) {
                bufferedFailures = failures;
                label->setNum(static_cast<int>(failures));
            }
        };
        if (state.yellow().has_ball_placement_failures()) {
            setBallPlacementFailures(
                m_yellowPlacementFailures,
                state.yellow().ball_placement_failures(),
                ui->placementFailuresYellow);
        }
        if (state.blue().has_ball_placement_failures()) {
            setBallPlacementFailures(
                m_bluePlacementFailures,
                state.blue().ball_placement_failures(),
                ui->placementFailuresBlue);
        }

        auto setTimeoutLabel = [](uint &bufferedTimeoutsLeft, uint &bufferedTimeoutTime, const ::SSL_Referee::TeamInfo &info, QLabel *label) {
            bool changed = false;
            if (bufferedTimeoutsLeft != info.timeouts()) {
                bufferedTimeoutsLeft = info.timeouts();
                changed = true;
            }

            if (bufferedTimeoutTime != info.timeout_time()) {
                bufferedTimeoutTime = info.timeout_time();
                changed = true;
            }

            if (changed) {
                uint timeoutTimeSeconds = bufferedTimeoutTime / 1000000;

                const QString text = QString { "%1 (%2:%3)" }
                    .arg(bufferedTimeoutsLeft)
                    .arg(timeoutTimeSeconds / 60, 1, 10)
                    .arg(timeoutTimeSeconds % 60, 2, 10, QChar('0'));
                label->setText(text);
            }
        };
        setTimeoutLabel(m_yellowTimeoutsLeft, m_yellowTimeoutTime, state.yellow(), ui->timeoutsLeftYellow);
        setTimeoutLabel(m_blueTimeoutsLeft, m_blueTimeoutTime, state.blue(), ui->timeoutsLeftBlue);

        auto setSubstitutions = [](uint &bufferedSubstitutions, uint substitutions, QLabel *label) {
            if (bufferedSubstitutions != substitutions) {
                bufferedSubstitutions = substitutions;
                label->setNum(static_cast<int>(substitutions));
            }
        };
        if (state.yellow().has_bot_substitutions_left()) {
            setSubstitutions(
                m_yellowSubstitutions,
                state.yellow().bot_substitutions_left(),
                ui->remainingSubstitutionsYellow);
        }
        if (state.blue().has_bot_substitutions_left()) {
            setSubstitutions(
                m_blueSubstitutions,
                state.blue().bot_substitutions_left(),
                ui->remainingSubstitutionsBlue);
        }
    }

    if (status->has_world_state()) {
        const auto [numBlueBots, numYellowBots] = computeRobotsInField(status->world_state());
        if (m_currentRobotCountBlue != numBlueBots) {
            m_currentRobotCountBlue = numBlueBots;
            currentRobotCountChanged = true;
        }
        if (m_currentRobotCountYellow != numYellowBots) {
            m_currentRobotCountYellow = numYellowBots;
            currentRobotCountChanged = true;
        }
    }
    if (currentRobotCountChanged) {
        ui->allowedBotsBlue->setText(QString("%1/%2").arg(m_currentRobotCountBlue).arg(m_allowedRobotCountBlue));
        ui->allowedBotsYellow->setText(QString("%1/%2").arg(m_currentRobotCountYellow).arg(m_allowedRobotCountYellow));
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
    ui->allowedBotsLabelBlue->setStyleSheet(blue);
    ui->allowedBotsBlue->setStyleSheet(blue);
    ui->keeperIdBlue->setStyleSheet(blue);
    ui->keeperTextLabelBlue->setStyleSheet(blue);
    ui->numberOfCardsBlue->setStyleSheet(blue);
    ui->cardTextLabelBlue->setStyleSheet(blue);
    ui->redCardCountBlue->setStyleSheet(blue);
    ui->redCardTextLabelBlue->setStyleSheet(blue);
    ui->foulLabelTextBlue->setStyleSheet(blue);
    ui->foulCounterBlue->setStyleSheet(blue);
    ui->placementFailuresLabelBlue->setStyleSheet(blue);
    ui->placementFailuresBlue->setStyleSheet(blue);
    ui->timeoutsLeftLabelBlue->setStyleSheet(blue);
    ui->timeoutsLeftBlue->setStyleSheet(blue);
    ui->remainingSubstitutionsBlue->setStyleSheet(blue);
    ui->remainingSubstitutionsBlueDesc->setStyleSheet(blue);

    ui->allowedBotsLabelYellow->setStyleSheet(yellow);
    ui->allowedBotsYellow->setStyleSheet(yellow);
    ui->keeperIdYellow->setStyleSheet(yellow);
    ui->keeperTextLabelYellow->setStyleSheet(yellow);
    ui->numberOfCardsYellow->setStyleSheet(yellow);
    ui->cardTextLabelYellow->setStyleSheet(yellow);
    ui->redCardCountYellow->setStyleSheet(yellow);
    ui->redCardTextLabelYellow->setStyleSheet(yellow);
    ui->foulLabelTextYellow->setStyleSheet(yellow);
    ui->foulCounterYellow->setStyleSheet(yellow);
    ui->placementFailuresLabelYellow->setStyleSheet(yellow);
    ui->placementFailuresYellow->setStyleSheet(yellow);
    ui->timeoutsLeftLabelYellow->setStyleSheet(yellow);
    ui->timeoutsLeftYellow->setStyleSheet(yellow);
    ui->remainingSubstitutionsYellow->setStyleSheet(yellow);
    ui->remainingSubstitutionsYellowDesc->setStyleSheet(yellow);
}
