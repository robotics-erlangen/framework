/***************************************************************************
 *   Copyright 2020 Philipp Nordhus, Andreas Wendler                       *
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

#include "simulatorconfigwidget.h"
#include "ui_simulatorconfigwidget.h"
#include "protobuf/command.pb.h"
#include "protobuf/ssl_simulation_custom_erforce_realism.pb.h"
#include "protobuf/ssl_simulation_control.pb.h"
#include "config/config.h"
#include <QCheckBox>
#include <QDoubleSpinBox>
#include <QAction>
#include <QSettings>
#include <QDirIterator>
#include <google/protobuf/text_format.h>

SimulatorConfigWidget::SimulatorConfigWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::SimulatorConfigWidget)
{
    ui->setupUi(this);

    connect(ui->chkEnableNoise, &QCheckBox::stateChanged, this, &SimulatorConfigWidget::sendAll);
    connect(ui->chkEnableInvisibleBall, &QCheckBox::stateChanged, this, &SimulatorConfigWidget::sendAll);
    connect(ui->chkEnableInvisibleBall, &QCheckBox::toggled, ui->spinBallVisibilityThreshold, &QSpinBox::setEnabled);
    connect(ui->chkEnableInvisibleBall, &QCheckBox::toggled, ui->ballVisibilityThresholdLabel, &QSpinBox::setEnabled);

    connect(ui->spinBallVisibilityThreshold, SIGNAL(valueChanged(int)), SLOT(sendAll()));
    connect(ui->spinCameraOverlap, SIGNAL(valueChanged(int)), SLOT(sendAll()));
    connect(ui->spinCameraPositionError, SIGNAL(valueChanged(int)), this, SLOT(sendAll()));
    connect(ui->spinPositionOffset, SIGNAL(valueChanged(double)), this, SLOT(sendAll()));
    connect(ui->spinPacketLoss, SIGNAL(valueChanged(int)), this, SLOT(sendAll()));
    connect(ui->spinReplyLoss, SIGNAL(valueChanged(int)), this, SLOT(sendAll()));

    connect(ui->spinStddevBall, SIGNAL(valueChanged(double)), SLOT(sendAll()));
    connect(ui->spinStddevRobotPos, SIGNAL(valueChanged(double)), SLOT(sendAll()));
    connect(ui->spinStddevRobotPhi, SIGNAL(valueChanged(double)), SLOT(sendAll()));
    connect(ui->spinStdDevBallArea, SIGNAL(valueChanged(double)), SLOT(sendAll()));
    connect(ui->spinDribblerBallDetections, SIGNAL(valueChanged(double)), SLOT(sendAll()));
    connect(ui->spinMissingDetections, SIGNAL(valueChanged(double)), SLOT(sendAll()));
    connect(ui->spinMissingRobotDetections, SIGNAL(valueChanged(double)), SLOT(sendAll()));

    connect(ui->chkSimulateDribbling, &QCheckBox::stateChanged, this, &SimulatorConfigWidget::sendAll);

    connect(ui->spinVisionDelay, SIGNAL(valueChanged(int)), SLOT(sendAll()));
    connect(ui->spinProcessingTime, SIGNAL(valueChanged(int)), SLOT(sendAll()));

    connect(ui->enableWorstCaseVision, &QCheckBox::toggled, this, &SimulatorConfigWidget::sendAll);
    connect(ui->worstCaseBallDetections, SIGNAL(valueChanged(double)), this, SLOT(sendAll()));
    connect(ui->worstCaseRobotDetections, SIGNAL(valueChanged(double)), this, SLOT(sendAll()));

    connect(ui->realismPreset, &QComboBox::currentTextChanged, this, &SimulatorConfigWidget::realismPresetChanged);
}

SimulatorConfigWidget::~SimulatorConfigWidget()
{
    save();
    delete ui;
}

void SimulatorConfigWidget::load()
{
    ui->realismPreset->clear();

    // find all configuration files
    QDirIterator dirIterator(QString(ERFORCE_CONFDIR) + "simulator-realism", {"*.txt"}, QDir::AllEntries | QDir::NoSymLinks | QDir::NoDotAndDotDot);
    while (dirIterator.hasNext()) {
        QFileInfo file(dirIterator.next());
        QString shownFilename = file.fileName().split(".").first();
        ui->realismPreset->addItem(shownFilename);
    }

#ifdef EASY_MODE
    const auto defaultPreset = "Friendly";
#else
    const auto defaultPreset = "Realistic";
#endif

    QSettings s;
    QString selectedFile = s.value("SimulatorConfig/RealismPreset", defaultPreset).toString();

    ui->realismPreset->setCurrentText(selectedFile);
}

void SimulatorConfigWidget::save()
{
    QSettings s;
    s.setValue("SimulatorConfig/RealismPreset", ui->realismPreset->currentText());
}

void SimulatorConfigWidget::realismPresetChanged(QString name)
{
    // load preset from file
    QFile file(QString(ERFORCE_CONFDIR) + "simulator-realism/" + name.replace("&", "") + ".txt");
    file.open(QFile::ReadOnly);
    QString str = file.readAll();
    file.close();
    std::string s = qPrintable(str);

    RealismConfigErForce config;
    google::protobuf::TextFormat::Parser parser;
    parser.AllowPartialMessage(false);
    parser.ParseFromString(s, &config);

    ui->spinStddevBall->setValue(config.stddev_ball_p());
    ui->spinStddevRobotPos->setValue(config.stddev_robot_p());
    ui->spinStddevRobotPhi->setValue(config.stddev_robot_phi());
    ui->spinStdDevBallArea->setValue(config.stddev_ball_area());
    ui->spinDribblerBallDetections->setValue(config.dribbler_ball_detections());
    ui->chkEnableInvisibleBall->setChecked(config.enable_invisible_ball());
    ui->spinBallVisibilityThreshold->setValue(config.ball_visibility_threshold() * 100.0f);
    ui->spinCameraOverlap->setValue(config.camera_overlap() * 100.0f);
    ui->spinCameraPositionError->setValue(config.camera_position_error() * 100.0f);
    ui->spinPositionOffset->setValue(config.object_position_offset() * 100.0f);
    ui->spinPacketLoss->setValue(config.robot_command_loss() * 100.0f);
    ui->spinReplyLoss->setValue(config.robot_response_loss() * 100.0f);
    ui->spinMissingDetections->setValue(config.missing_ball_detections() * 100.0f);
    ui->spinVisionDelay->setValue(config.vision_delay() / 1000000LL); // from ns to ms
    ui->spinProcessingTime->setValue(config.vision_processing_time() / 1000000LL);
    ui->chkSimulateDribbling->setChecked(config.simulate_dribbling());
    ui->spinMissingRobotDetections->setValue(config.missing_robot_detections() * 100.0f);

    bool enableNoise = ui->spinStddevBall->value() != 0 || ui->spinStddevRobotPos->value() != 0 ||
                       ui->spinStddevRobotPhi->value() != 0 || ui->spinStdDevBallArea->value() != 0 ||
                       ui->spinDribblerBallDetections->value() != 0 || ui->spinMissingDetections->value() != 0 ||
                       ui->spinMissingRobotDetections->value() != 0;
    ui->chkEnableNoise->setChecked(enableNoise);
}

void SimulatorConfigWidget::sendAll()
{
    Command command(new amun::Command);

    // robot realism
    command->mutable_simulator()->mutable_realism_config()->set_robot_command_loss(ui->spinPacketLoss->value() / 100.0f);
    command->mutable_simulator()->mutable_realism_config()->set_robot_response_loss(ui->spinReplyLoss->value() / 100.0f);

    // delays
    // from ms to ns
    command->mutable_simulator()->mutable_realism_config()->set_vision_delay(ui->spinVisionDelay->value() * 1000 * 1000);
    command->mutable_simulator()->mutable_realism_config()->set_vision_processing_time(ui->spinProcessingTime->value() * 1000 * 1000);

    // simulator noise
    {
        bool isEnabled = ui->chkEnableNoise->checkState() != Qt::Unchecked;

        auto realism = command->mutable_simulator()->mutable_realism_config();
        realism->set_stddev_ball_p(isEnabled ? ui->spinStddevBall->value() : 0);
        realism->set_stddev_robot_p(isEnabled ? ui->spinStddevRobotPos->value() : 0);
        realism->set_stddev_robot_phi(isEnabled ? ui->spinStddevRobotPhi->value(): 0);
        realism->set_stddev_ball_area(isEnabled ? ui->spinStdDevBallArea->value(): 0);
        realism->set_dribbler_ball_detections(isEnabled ? ui->spinDribblerBallDetections->value() : 0);
        realism->set_missing_ball_detections(isEnabled ? ui->spinMissingDetections->value() / 100.0f : 0);
        realism->set_simulate_dribbling(isEnabled ? ui->chkSimulateDribbling->isChecked() : false);
        realism->set_missing_robot_detections(isEnabled ? ui->spinMissingRobotDetections->value() / 100.0f : 0);
    }

    // invisible ball
    {
        bool isEnabled = ui->chkEnableInvisibleBall->checkState() != Qt::Unchecked;
        command->mutable_simulator()->mutable_realism_config()->set_enable_invisible_ball(isEnabled);
        command->mutable_simulator()->mutable_realism_config()->set_ball_visibility_threshold(ui->spinBallVisibilityThreshold->value() / 100.0f);
    }

    // camera overlap
    command->mutable_simulator()->mutable_realism_config()->set_camera_overlap(ui->spinCameraOverlap->value() / 100.0f);

    // position errors
    command->mutable_simulator()->mutable_realism_config()->set_camera_position_error(ui->spinCameraPositionError->value() / 100.0f);
    command->mutable_simulator()->mutable_realism_config()->set_object_position_offset(ui->spinPositionOffset->value() / 100.0f);

    // worst case vision
    command->mutable_simulator()->mutable_vision_worst_case()->set_min_ball_detection_time(
                ui->enableWorstCaseVision->isChecked() ? ui->worstCaseBallDetections->value() : 0);
    command->mutable_simulator()->mutable_vision_worst_case()->set_min_robot_detection_time(
                ui->enableWorstCaseVision->isChecked() ? ui->worstCaseRobotDetections->value() : 0);


    emit sendCommand(command);
}
