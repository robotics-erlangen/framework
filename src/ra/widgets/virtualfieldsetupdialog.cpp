/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#include "virtualfieldsetupdialog.h"
#include "ui_virtualfieldsetupdialog.h"
#include "protobuf/geometry.h"
#include <QCheckBox>

VirtualFieldSetupDialog::VirtualFieldSetupDialog(const VirtualFieldConfiguration &start, QWidget *parent) :
    QDialog(parent),
    ui(new Ui::VirtualFieldSetupDialog)
{
    ui->setupUi(this);
    setFixedSize(width(), height());
    connect(ui->quadSizeWidth, &QRadioButton::toggled, [=](bool set){ if (set) ui->widthSpinBox->setValue(QUAD_SIZE_WIDTH); });
    connect(ui->doubleSizeWidth, &QRadioButton::toggled, [=](bool set){ if (set) ui->widthSpinBox->setValue(DOUBLE_SIZE_WIDTH); });
    connect(ui->quadSizeHeight, &QRadioButton::toggled, [=](bool set){ if (set) ui->heightSpinBox->setValue(QUAD_SIZE_HEIGHT); });
    connect(ui->doubleSizeHeight, &QRadioButton::toggled, [=](bool set){ if (set) ui->heightSpinBox->setValue(DOUBLE_SIZE_HEIGHT); });
    connect(ui->enableVirtualField, &QCheckBox::toggled, ui->widthGroupBox, &QGroupBox::setEnabled);
    connect(ui->enableVirtualField, &QCheckBox::toggled, ui->heightGroupBox, &QGroupBox::setEnabled);
    connect(ui->enableVirtualField, &QCheckBox::toggled, ui->goalPositionSelection, &GoalSelectionWidget::setEnabled);
    connect(ui->okButton, &QPushButton::clicked, this, &VirtualFieldSetupDialog::close);
    connect(ui->widthSpinBox, SIGNAL(valueChanged(double)), SLOT(widthChanged(double)));
    connect(ui->heightSpinBox, SIGNAL(valueChanged(double)), SLOT(heightChanged(double)));
    ui->widthSpinBox->setValue(start.width);
    ui->heightSpinBox->setValue(start.height);
    ui->goalPositionSelection->setActiveButton(start.goalId);
}

VirtualFieldSetupDialog::~VirtualFieldSetupDialog()
{
    delete ui;
}

VirtualFieldConfiguration VirtualFieldSetupDialog::getResult(const world::Geometry &realGeometry)
{
    VirtualFieldConfiguration result;
    result.enabled = ui->enableVirtualField->isChecked();
    bool exactQuadField = ui->quadSizeWidth->isChecked() && ui->quadSizeHeight->isChecked();
    geometrySetDefault(&result.geometry, exactQuadField);
    result.geometry.set_field_width(ui->widthSpinBox->value());
    result.geometry.set_field_height(ui->heightSpinBox->value());
    result.geometry.set_goal_depth(realGeometry.goal_depth());
    result.geometry.set_goal_height(realGeometry.goal_height());
    result.geometry.set_goal_wall_width(realGeometry.goal_wall_width());
    result.geometry.set_goal_width(realGeometry.goal_width());

    result.transform = ui->goalPositionSelection->fieldTransform(realGeometry.field_width(), realGeometry.field_height(), ui->heightSpinBox->value());
    result.width = ui->widthSpinBox->value();
    result.height = ui->heightSpinBox->value();
    result.goalId = ui->goalPositionSelection->goalId();
    return result;
}

void VirtualFieldSetupDialog::widthChanged(double width)
{
    if (width == QUAD_SIZE_WIDTH) {
        ui->quadSizeWidth->setChecked(true);
    } else if (width == DOUBLE_SIZE_WIDTH) {
        ui->doubleSizeWidth->setChecked(true);
    } else {
        ui->customWidth->setChecked(true);
    }
}

void VirtualFieldSetupDialog::heightChanged(double height)
{
    if (height == QUAD_SIZE_HEIGHT) {
        ui->quadSizeHeight->setChecked(true);
    } else if (height == DOUBLE_SIZE_HEIGHT) {
        ui->doubleSizeHeight->setChecked(true);
    } else {
        ui->customHeight->setChecked(true);
    }
}
