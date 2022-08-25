/***************************************************************************
 *   Copyright 2022 Andreas Wendler                                        *
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

#include "fieldparameters.h"
#include "ui_fieldparameters.h"

#include <QSettings>

FieldParameters::FieldParameters(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::FieldSetup)
{
    ui->setupUi(this);

    connect(ui->spinFastDecel, QOverload<double>::of(&QDoubleSpinBox::valueChanged), this, &FieldParameters::updateParameters);
    connect(ui->spinSlowDecel, QOverload<double>::of(&QDoubleSpinBox::valueChanged), this, &FieldParameters::updateParameters);
    connect(ui->spinSwitchRatio, QOverload<double>::of(&QDoubleSpinBox::valueChanged), this, &FieldParameters::updateParameters);
    connect(ui->spinXYDamping, QOverload<double>::of(&QDoubleSpinBox::valueChanged), this, &FieldParameters::updateParameters);
    connect(ui->spinZDamping, QOverload<double>::of(&QDoubleSpinBox::valueChanged), this, &FieldParameters::updateParameters);

    connect(ui->useVisionParameters, &QPushButton::pressed, this, &FieldParameters::useVisionParameters);
}

FieldParameters::~FieldParameters()
{
    delete ui;
}

world::BallModel FieldParameters::getModel() const
{
    world::BallModel model;
    model.set_fast_deceleration(ui->spinFastDecel->value());
    model.set_slow_deceleration(ui->spinSlowDecel->value());
    model.set_switch_ratio(ui->spinSwitchRatio->value());
    model.set_z_damping(ui->spinZDamping->value());
    model.set_xy_damping(ui->spinXYDamping->value());
    return model;
}

void FieldParameters::applyModel(const world::BallModel &model)
{
    m_preventUpdate = true;
    ui->spinFastDecel->setValue(model.fast_deceleration());
    ui->spinSlowDecel->setValue(model.slow_deceleration());
    ui->spinSwitchRatio->setValue(model.switch_ratio());
    ui->spinZDamping->setValue(model.z_damping());
    ui->spinXYDamping->setValue(model.xy_damping());
    m_preventUpdate = false;
}

void FieldParameters::updateParameters()
{
    if (m_preventUpdate) {
        return;
    }
    Command command(new amun::Command);
    const auto model = getModel();
    command->mutable_tracking()->mutable_ball_model()->CopyFrom(model);
    emit sendCommand(command);
}

void FieldParameters::useVisionParameters()
{
    applyModel(m_visionBallModel);
    updateParameters();
}

void FieldParameters::handleStatus(const Status &status)
{
    if (status->has_geometry() && status->geometry().has_ball_model()) {
        applyModel(status->geometry().ball_model());
    }
    if (status->has_world_state() && status->world_state().has_is_simulated()) {
        const QString text = status->world_state().is_simulated() ? "Simulator" : "Real Field";
        ui->fieldTypeText->setText(text);
    }
    if (status->has_world_state()) {
        for (const auto &frame : status->world_state().vision_frames()) {
            if (frame.has_geometry() && frame.geometry().has_models()) {
                if (frame.geometry().models().has_straight_two_phase()) {
                    const auto &model = frame.geometry().models().straight_two_phase();
                    m_visionBallModel.set_fast_deceleration(-model.acc_slide());
                    m_visionBallModel.set_slow_deceleration(-model.acc_roll());
                    m_visionBallModel.set_switch_ratio(model.k_switch());
                }
                if (frame.geometry().models().has_chip_fixed_loss()) {
                    const auto &model = frame.geometry().models().chip_fixed_loss();
                    m_visionBallModel.set_z_damping(model.damping_z());
                    m_visionBallModel.set_xy_damping(model.damping_xy_first_hop());
                }
            }
        }
    }
}
