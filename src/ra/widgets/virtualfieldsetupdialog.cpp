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
    connect(ui->enableVirtualField, &QCheckBox::toggled, this, &VirtualFieldSetupDialog::adaptGoalBoxVisibility);
    connect(ui->enableVirtualField, &QCheckBox::toggled, ui->defenseGroupBox, &QGroupBox::setEnabled);
    connect(ui->enableVirtualField, &QCheckBox::toggled, ui->goalPositionSelection, &GoalSelectionWidget::setEnabled);
    connect(ui->enableVirtualField, &QCheckBox::toggled, ui->label, &GoalSelectionWidget::setEnabled);
    connect(ui->okButton, &QPushButton::clicked, this, &VirtualFieldSetupDialog::close);
    connect(ui->widthSpinBox, SIGNAL(valueChanged(double)), SLOT(widthChanged(double)));
    connect(ui->heightSpinBox, SIGNAL(valueChanged(double)), SLOT(heightChanged(double)));
    connect(ui->goalPositionSelection, SIGNAL(goalIdChanged(int)), SLOT(adaptGoalBoxVisibility()));
    ui->widthSpinBox->setValue(start.width);
    ui->heightSpinBox->setValue(start.height);
    ui->goalPositionSelection->setActiveButton(start.goalId);
    ui->enableVirtualField->setChecked(start.enabled);
    switch (start.goalType) {
    case VirtualFieldConfiguration::QUAD_SIZE: ui->quadSizeGoal->setChecked(true); break;
    case VirtualFieldConfiguration::DOUBLE_SIZE: ui->doubleSizeGoal->setChecked(true); break;
    case VirtualFieldConfiguration::FROM_REAL: ui->realGoal->setChecked(true); break;
    }
    switch (start.defenseType) {
    case VirtualFieldConfiguration::QUAD_SIZE: ui->quadSizeDefense->setChecked(true); break;
    case VirtualFieldConfiguration::DOUBLE_SIZE: ui->doubleSizeDefense->setChecked(true); break;
    case VirtualFieldConfiguration::FROM_REAL: ui->realDefense->setChecked(true); break;
    }
    adaptGoalBoxVisibility();
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
    result.geometry.set_goal_wall_width(realGeometry.goal_wall_width());

    // goal depth and height are not really relevant and are taken from the real field anyways
    result.geometry.set_goal_depth(realGeometry.goal_depth());
    result.geometry.set_goal_height(realGeometry.goal_height());
    if (ui->realGoal->isChecked()) {
        result.goalType = VirtualFieldConfiguration::FROM_REAL;
        result.geometry.set_goal_width(realGeometry.goal_width());
    } else {
        result.goalType = ui->quadSizeGoal->isChecked() ? VirtualFieldConfiguration::QUAD_SIZE : VirtualFieldConfiguration::DOUBLE_SIZE;
        result.geometry.set_goal_width(ui->quadSizeGoal->isChecked() ? 1.20f : 1.00f);
    }

    if (ui->realDefense->isChecked()) {
        result.defenseType = VirtualFieldConfiguration::FROM_REAL;
        result.geometry.set_defense_radius(realGeometry.defense_radius());
        result.geometry.set_defense_stretch(realGeometry.defense_stretch());
        result.geometry.set_defense_width(realGeometry.defense_width());
        result.geometry.set_defense_height(realGeometry.defense_height());
        result.geometry.set_type(realGeometry.type());
    } else {
        result.defenseType = ui->quadSizeDefense->isChecked() ? VirtualFieldConfiguration::QUAD_SIZE : VirtualFieldConfiguration::DOUBLE_SIZE;
        result.geometry.set_defense_width(ui->quadSizeDefense->isChecked() ? 2.40f : 2.00f);
        result.geometry.set_defense_height(ui->quadSizeDefense->isChecked() ? 1.20f : 1.00f);
        result.geometry.set_type(world::Geometry::TYPE_2018);
    }

    result.transform = ui->goalPositionSelection->fieldTransform(realGeometry.field_width(), realGeometry.field_height(), ui->heightSpinBox->value());
    result.width = ui->widthSpinBox->value();
    result.height = ui->heightSpinBox->value();
    result.goalId = ui->goalPositionSelection->goalId();
    return result;
}

void VirtualFieldSetupDialog::adaptGoalBoxVisibility()
{
    if (ui->goalPositionSelection->isSelectionRealGoal()) {
        ui->goalGroupBox->setDisabled(true);
        ui->realGoal->setChecked(true);
    } else {
        ui->goalGroupBox->setEnabled(ui->enableVirtualField->isChecked());
    }
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
