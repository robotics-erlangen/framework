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

#include "refereewidget.h"
#include "ui_refereewidget.h"
#include "strategysearch.h"
#include "config/config.h"
#include "protobuf/command.pb.h"
#include "protobuf/gamestate.pb.h"
#include "protobuf/ssl_referee.pb.h"
#include <google/protobuf/descriptor.h>
#include <QSettings>
#include <QSignalMapper>
#include <memory>

RefereeWidget::RefereeWidget(QWidget *parent) :
    QWidget(parent), m_yellowKeeperId(0), m_blueKeeperId(0), m_stage(SSL_Referee::NORMAL_FIRST_HALF)
{
    ui = new Ui::RefereeWidget;
    ui->setupUi(this);

    registerCommand(ui->btnRefereeHalt, SSL_Referee::HALT, QString());
    registerCommand(ui->btnRefereeStop, SSL_Referee::STOP, QString());
    registerCommand(ui->btnRefereeForceStart, SSL_Referee::FORCE_START, QString());
    registerCommand(ui->btnRefereeStart, SSL_Referee::NORMAL_START, QString());

    setStyleSheets(false);

    // ensure ui values match with internal defaults
    ui->keeperIdYellow->setValue(m_yellowKeeperId);
    ui->keeperIdBlue->setValue(m_blueKeeperId);

    // connect AFTER setting the initial value
    connect(ui->keeperIdYellow, SIGNAL(valueChanged(int)), SLOT(handleYellowKeeper(int)));
    connect(ui->keeperIdBlue, SIGNAL(valueChanged(int)), SLOT(handleBlueKeeper(int)));

    const google::protobuf::EnumDescriptor *stages = SSL_Referee::Stage_descriptor();
    int activeStage = -1;
    for (int i = 0; i < stages->value_count(); ++i) {
        const google::protobuf::EnumValueDescriptor *stage = stages->value(i);
        ui->gameStage->addItem(QString::fromStdString(stage->name()), stage->number());
        if ((int)m_stage == stage->number()) {
            activeStage = i;
        }
    }
    ui->gameStage->setCurrentIndex(activeStage); // select default value
    connect(ui->gameStage, SIGNAL(currentIndexChanged(int)), SLOT(handleStage(int)));
    connect(ui->useInternalAutoref, SIGNAL(toggled(bool)), this, SIGNAL(enableInternalAutoref(bool)));
    connect(this, &RefereeWidget::enableInternalAutoref, ui->autoref, &TeamWidget::setEnabled);
    connect(ui->sidesFlipped, SIGNAL(toggled(bool)), this, SIGNAL(changeSidesFlipped(bool)));

    connect(ui->autoref, &TeamWidget::sendCommand, this, &RefereeWidget::sendCommand);

    ui->autoref->init(amun::StatusStrategyWrapper::AUTOREF);

    QSignalMapper *signalMapper = new QSignalMapper(this);
    connect(ui->btnRefereeAddCardBlue, SIGNAL(clicked()), signalMapper, SLOT(map()));
    signalMapper->setMapping(ui->btnRefereeAddCardBlue, false);
    connect(ui->btnRefereeAddCardYellow, SIGNAL(clicked()), signalMapper, SLOT(map()));
    signalMapper->setMapping(ui->btnRefereeAddCardYellow, true);
    connect(signalMapper, SIGNAL(mapped(int)), this, SIGNAL(sendYellowCard(int)));
}

RefereeWidget::~RefereeWidget()
{
    saveConfig();
    delete ui;
}

void RefereeWidget::saveConfig()
{
    QSettings s;
    s.beginGroup("Referee");
    s.setValue("YellowKeeper", ui->keeperIdYellow->value());
    s.setValue("BlueKeeper", ui->keeperIdBlue->value());
    s.setValue("useInternalAutoref", ui->useInternalAutoref->isChecked());
    s.setValue("SidesFlipped", ui->sidesFlipped->isChecked());
    s.endGroup();

    s.beginGroup("Autoref");
    s.setValue("RecentScripts", *m_recentScripts);
    s.endGroup();

    ui->autoref->saveConfig();
}

void RefereeWidget::load()
{
    QSettings s;
    s.beginGroup("Referee");
    ui->keeperIdYellow->setValue(s.value("YellowKeeper", 0).toInt());
    ui->keeperIdBlue->setValue(s.value("BlueKeeper", 0).toInt());
    ui->useInternalAutoref->setChecked(s.value("useInternalAutoref", false).toBool());
    ui->sidesFlipped->setChecked(s.value("SidesFlipped", false).toBool());
    s.endGroup();

    s.beginGroup("Autoref");
    QStringList recent = s.value("RecentScripts").toStringList();
    s.endGroup();

    recent = ra::sanitizeRecentScripts(recent, { "init.lua" });
    ra::searchForStrategies(recent, ERFORCE_AUTOREFDIR, "init.lua");
    m_recentScripts = std::make_shared<QStringList>(recent);

    ui->autoref->setRecentScripts(m_recentScripts);
    ui->autoref->load();
}

void RefereeWidget::shutdownInternalAutoref()
{
    ui->autoref->close();
}

void RefereeWidget::forceAutoReload(bool force)
{
    ui->autoref->forceAutoReload(force);
}

void RefereeWidget::setStyleSheets(bool useDark)
{
    ui->autoref->setUseDarkColors(useDark);

    QString yellow, blue;
    if (useDark) {
        yellow = createStyleSheet(UI_YELLOW_COLOR_DARK);
        blue = createStyleSheet(UI_BLUE_COLOR_DARK);
    } else {
        yellow = createStyleSheet(UI_YELLOW_COLOR_LIGHT);
        blue = createStyleSheet(UI_BLUE_COLOR_LIGHT);
    }

    registerCommand(ui->btnRefereeKickoffBlue, SSL_Referee::PREPARE_KICKOFF_BLUE, blue);
    registerCommand(ui->btnRefereePenaltyBlue, SSL_Referee::PREPARE_PENALTY_BLUE, blue);
    registerCommand(ui->btnRefereeDirectBlue, SSL_Referee::DIRECT_FREE_BLUE, blue);

    registerCommand(ui->btnRefereeKickoffYellow, SSL_Referee::PREPARE_KICKOFF_YELLOW, yellow);
    registerCommand(ui->btnRefereePenaltyYellow, SSL_Referee::PREPARE_PENALTY_YELLOW, yellow);
    registerCommand(ui->btnRefereeDirectYellow, SSL_Referee::DIRECT_FREE_YELLOW, yellow);

    ui->keeperIdYellow->setStyleSheet(yellow);
    ui->keeperIdBlue->setStyleSheet(blue);

    ui->btnRefereeAddCardYellow->setStyleSheet(yellow);
    ui->btnRefereeAddCardBlue->setStyleSheet(blue);
}

void RefereeWidget::handleStatus(const Status &status)
{
    ui->autoref->handleStatus(status);
    if (status->has_game_state()) {
        // just update the GUI!, prevents sending referee packets
        blockSignals(true);
        const amun::GameState &state = status->game_state();
        // only update values when neccessary
        // prevents stuttering when scrolling through the values
        // as it blocks setting the old value again while the update is still pending
        const uint yellowKeeperId = state.yellow().goalie();
        const uint blueKeeperId = state.blue().goalie();

        if (yellowKeeperId != m_yellowKeeperId) {
            ui->keeperIdYellow->setValue(yellowKeeperId);
            m_yellowKeeperId = yellowKeeperId;
        }
        if (blueKeeperId != m_blueKeeperId) {
            ui->keeperIdBlue->setValue(blueKeeperId);
            m_blueKeeperId = blueKeeperId;
        }

        const SSL_Referee::Stage stage = state.stage();
        if (stage != m_stage) {
            int stageIndex = ui->gameStage->findData((int)stage);
            if (stageIndex != -1) {
                ui->gameStage->setCurrentIndex(stageIndex);
            }
            m_stage = stage;
        }
        blockSignals(false);
    }
}

QString RefereeWidget::createStyleSheet(const QColor &color)
{
    const QString f("QToolButton { background-color: %1; border: 1px solid %2; border-radius: 3px; }");
    return f.arg(color.lighter(180).name(), color.darker(140).name());
}

void RefereeWidget::registerCommand(QWidget *button, SSL_Referee::Command c, const QString &stylesheet)
{
    button->setStyleSheet(stylesheet);
    button->setProperty("command", (int)c);
    connect(button, SIGNAL(clicked()), SLOT(handleCommand()));
}

void RefereeWidget::handleCommand()
{
    SSL_Referee::Command command = (SSL_Referee::Command)sender()->property("command").toInt();
    emit changeCommand(command);
}

void RefereeWidget::handleStage(int index)
{
    SSL_Referee::Stage stage = (SSL_Referee::Stage)ui->gameStage->itemData(index).toInt();
    emit changeStage(stage);
}

void RefereeWidget::handleYellowKeeper(int id)
{
    emit changeYellowKeeper((uint)id);
}

void RefereeWidget::handleBlueKeeper(int id)
{
    emit changeBlueKeeper((uint)id);
}
