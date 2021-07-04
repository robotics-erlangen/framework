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
    QWidget(parent),
    m_yellowKeeperId(0),
    m_blueKeeperId(0),
    m_stage(SSL_Referee::NORMAL_FIRST_HALF)
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
    connect(this, &RefereeWidget::enableInternalAutoref, ui->enableRobotExchange, &QCheckBox::setEnabled);
    connect(ui->enableRobotExchange, &QCheckBox::toggled, this, &RefereeWidget::handleAutomaticRobotExchangeChanged);

    connect(ui->autoref, &TeamWidget::sendCommand, this, &RefereeWidget::sendCommand);

    ui->autoref->init(amun::StatusStrategyWrapper::AUTOREF);

    QSignalMapper *signalMapper = new QSignalMapper(this);
    connect(ui->btnRefereeAddCardBlue, SIGNAL(clicked()), signalMapper, SLOT(map()));
    signalMapper->setMapping(ui->btnRefereeAddCardBlue, false);
    connect(ui->btnRefereeAddCardYellow, SIGNAL(clicked()), signalMapper, SLOT(map()));
    signalMapper->setMapping(ui->btnRefereeAddCardYellow, true);
    connect(signalMapper, SIGNAL(mapped(int)), this, SIGNAL(sendYellowCard(int)));

    ui->boxDivision->addItem("A");
    ui->boxDivision->addItem("B");
    connect(ui->boxDivision, &QComboBox::currentTextChanged, this, &RefereeWidget::divisionChanged);
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
    s.setValue("Division", ui->boxDivision->currentText());
    s.setValue("RobotExchange", ui->enableRobotExchange->isChecked());
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

    // this section MUST be first, in order for the internal ssl game controller not to swallow
    // the referee updates in its brief activation
    ui->useInternalAutoref->setChecked(s.value("useInternalAutoref", false).toBool());
    // emit some values regardless of change, so that it works with amun wether or not the default values match
    emit enableInternalAutoref(ui->useInternalAutoref->isChecked());

    ui->keeperIdYellow->setValue(s.value("YellowKeeper", 0).toInt());
    ui->keeperIdBlue->setValue(s.value("BlueKeeper", 0).toInt());
    ui->sidesFlipped->setChecked(s.value("SidesFlipped", false).toBool());
    ui->boxDivision->setCurrentText(s.value("Division", "A").toString());
    ui->enableRobotExchange->setChecked(s.value("RobotExchange", true).toBool());
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

void RefereeWidget::enableNumberShortcuts(bool enable)
{
    if (enable) {
        ui->btnRefereeStop->setShortcut(Qt::Key_0);
        ui->btnRefereeForceStart->setShortcut(Qt::Key_5);
        ui->btnRefereeKickoffYellow->setShortcut(Qt::Key_1);
        ui->btnRefereeKickoffBlue->setShortcut(Qt::Key_3);
        ui->btnRefereeDirectYellow->setShortcut(Qt::Key_7);
        ui->btnRefereeDirectBlue->setShortcut(Qt::Key_9);
    } else {
        ui->btnRefereeStop->setShortcut(Qt::Key_0 + Qt::KeypadModifier);
        ui->btnRefereeForceStart->setShortcut(Qt::Key_5 + Qt::KeypadModifier);
        ui->btnRefereeKickoffYellow->setShortcut(Qt::Key_1 + Qt::KeypadModifier);
        ui->btnRefereeKickoffBlue->setShortcut(Qt::Key_3 + Qt::KeypadModifier);
        ui->btnRefereeDirectYellow->setShortcut(Qt::Key_7 + Qt::KeypadModifier);
        ui->btnRefereeDirectBlue->setShortcut(Qt::Key_9 + Qt::KeypadModifier);
    }
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
    // prevent updating values from log status packages
    // otherwise, the keeper will change for the simulator after viewing a log
    // (if ra has been closed in horus mode)
    if (!isEnabled()) {
        return;
    }
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


    // this check makes sure that the current division in the combobox is consistent with the one in the status packages
    if (status->has_geometry()) {
        const auto& geometry = status->geometry();
        if (geometry.has_division() && m_currentDivision != geometry.division()) {
            m_newDivisionDetected = true;
            m_currentDivision = geometry.division();
            switch (m_currentDivision) {
                case world::Geometry_Division_A:
                    ui->boxDivision->setCurrentText("A");
                    break;
                case world::Geometry_Division_B:
                    ui->boxDivision->setCurrentText("B");
                    break;
            }
        }
    }

    if (status->has_amun_state() && status->amun_state().has_game_controller() && status->amun_state().game_controller().has_current_state()) {

        const std::map<amun::StatusGameController::GameControllerState, QString> stateMap = {
            {amun::StatusGameController::STOPPED, "stopped"},
            {amun::StatusGameController::STARTING, "starting"},
            {amun::StatusGameController::RUNNING, "<font color=\"lightgreen\">running</font>"},
            {amun::StatusGameController::CRASHED, "<font color=\"red\">crashed :(</font>"},
            {amun::StatusGameController::NOT_RESPONDING, "<font color=\"red\">not responding :/</font>"},
        };
        auto state = status->amun_state().game_controller().current_state();

        QString fullGCState = QString("GC %1 is currently %2").arg(GAMECONTROLLER_RELEASE_VERSION).arg(stateMap.at(state));
        ui->gcStatusLabel->setText(fullGCState);
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

void RefereeWidget::divisionChanged(QString division)
{
    // don't send a "change division command" if boxDivision changed because of a status message
    if (m_newDivisionDetected) {
        m_newDivisionDetected = false;
        return;
    }

    if (division == "A") {
        m_currentDivision = world::Geometry_Division_A;
    } else if (division == "B") {
        m_currentDivision = world::Geometry_Division_B;
    } else {
        std::cerr << "Entered invalid division." << std::endl;
        return;
    }
    emit sendDivisionChange(m_currentDivision);
}

void RefereeWidget::handleAutomaticRobotExchangeChanged(bool enable)
{
    Command command(new amun::Command);
    command->mutable_referee()->set_use_automatic_robot_exchange(enable);
    emit sendCommand(command);
}
