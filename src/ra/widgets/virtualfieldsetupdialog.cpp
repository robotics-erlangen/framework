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

VirtualFieldSetupDialog::VirtualFieldSetupDialog(const VirtualFieldConfiguration &start,
                                                 const world::Geometry geometry,
                                                 float rotation,
                                                 QWidget *parent) :
    QDialog(parent),
    ui(new Ui::VirtualFieldSetupDialog),
    m_realGeometry(geometry)
{
    ui->setupUi(this);
    ui->goalPositionSelection->setRealGeom(&m_realGeometry);
    ui->goalPositionSelection->setRotation(rotation);
    connect(ui->divAWidth, &QRadioButton::toggled, [this](bool set){ if (set) ui->widthSpinBox->setValue(DIV_A_WIDTH); });
    connect(ui->divBWidth, &QRadioButton::toggled, [this](bool set){ if (set) ui->widthSpinBox->setValue(DIV_B_WIDTH); });
    connect(ui->divAHeight, &QRadioButton::toggled, [this](bool set){ if (set) ui->heightSpinBox->setValue(DIV_A_HEIGHT); });
    connect(ui->divBHeight, &QRadioButton::toggled, [this](bool set){ if (set) ui->heightSpinBox->setValue(DIV_B_HEIGHT); });
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
        case VirtualFieldConfiguration::DIV_A: ui->divAGoal->setChecked(true); break;
        case VirtualFieldConfiguration::DIV_B: ui->divBGoal->setChecked(true); break;
        case VirtualFieldConfiguration::FROM_REAL: ui->realGoal->setChecked(true); break;
    }
    switch (start.defenseType) {
        case VirtualFieldConfiguration::DIV_A: ui->divADefense->setChecked(true); break;
        case VirtualFieldConfiguration::DIV_B: ui->divBDefense->setChecked(true); break;
        case VirtualFieldConfiguration::FROM_REAL: ui->realDefense->setChecked(true); break;
    }
    adaptGoalBoxVisibility();

    // needs to be at the bottom because every widget needs to be initialized before the first call to getResult
    connect(ui->divAWidth, SIGNAL(toggled(bool)), SLOT(updatePreliminaryGeometry()));
    connect(ui->divBWidth, SIGNAL(toggled(bool)), SLOT(updatePreliminaryGeometry()));
    connect(ui->divAHeight, SIGNAL(toggled(bool)), SLOT(updatePreliminaryGeometry()));
    connect(ui->divBHeight, SIGNAL(toggled(bool)), SLOT(updatePreliminaryGeometry()));
    connect(ui->enableVirtualField, SIGNAL(toggled(bool)), SLOT(updatePreliminaryGeometry()));
    connect(ui->widthSpinBox, SIGNAL(valueChanged(double)), SLOT(updatePreliminaryGeometry()));
    connect(ui->heightSpinBox, SIGNAL(valueChanged(double)), SLOT(updatePreliminaryGeometry()));
    connect(ui->goalPositionSelection, SIGNAL(goalIdChanged(int)), SLOT(updatePreliminaryGeometry()));
}

VirtualFieldSetupDialog::~VirtualFieldSetupDialog()
{
    delete ui;
}

VirtualFieldConfiguration VirtualFieldSetupDialog::getResult()
{
    VirtualFieldConfiguration result;
    result.enabled = ui->enableVirtualField->isChecked();
    bool exactDivAField = ui->divAWidth->isChecked() && ui->divAHeight->isChecked();
    geometrySetDefault(&result.geometry, exactDivAField);

    // have not figured out a way to reasonably handle boundary width,
    // without introducing another UI element for which I don't have time right now
    result.geometry.clear_boundary_width_goal_line();
    result.geometry.clear_goal_substitution_area_width();

    result.geometry.set_field_width(ui->widthSpinBox->value());
    result.geometry.set_field_height(ui->heightSpinBox->value());
    result.geometry.set_goal_wall_width(m_realGeometry.goal_wall_width());

    // goal depth and height are not really relevant and are taken from the real field anyways
    result.geometry.set_goal_depth(m_realGeometry.goal_depth());
    result.geometry.set_goal_height(m_realGeometry.goal_height());
    if (ui->realGoal->isChecked()) {
        result.goalType = VirtualFieldConfiguration::FROM_REAL;
        result.geometry.set_goal_width(m_realGeometry.goal_width());
    } else {
        result.goalType = ui->divAGoal->isChecked() ? VirtualFieldConfiguration::DIV_A : VirtualFieldConfiguration::DIV_B;
        result.geometry.set_goal_width(ui->divAGoal->isChecked() ? 1.80f : 1.00f);
    }

    if (ui->realDefense->isChecked()) {
        result.defenseType = VirtualFieldConfiguration::FROM_REAL;
        result.geometry.set_defense_radius(m_realGeometry.defense_radius());
        result.geometry.set_defense_stretch(m_realGeometry.defense_stretch());
        result.geometry.set_defense_width(m_realGeometry.defense_width());
        result.geometry.set_defense_height(m_realGeometry.defense_height());
        result.geometry.set_type(m_realGeometry.type());
    } else {
        result.defenseType = ui->divADefense->isChecked() ? VirtualFieldConfiguration::DIV_A : VirtualFieldConfiguration::DIV_B;
        result.geometry.set_defense_width(ui->divADefense->isChecked() ? 3.60f : 2.00f);
        result.geometry.set_defense_height(ui->divADefense->isChecked() ? 1.80f : 1.00f);
        result.geometry.set_type(world::Geometry::TYPE_2018);
    }

    result.transform = ui->goalPositionSelection->fieldTransform(m_realGeometry.field_width(), m_realGeometry.field_height(), ui->heightSpinBox->value());
    result.width = ui->widthSpinBox->value();
    result.height = ui->heightSpinBox->value();
    result.goalId = ui->goalPositionSelection->goalId();
    return result;
}

void VirtualFieldSetupDialog::updatePreliminaryGeometry()
{
    if (ui->enableVirtualField->isChecked()) {
        const auto result = getResult();
        ui->goalPositionSelection->setPreliminaryGeom(result);
    } else {
        ui->goalPositionSelection->setPreliminaryGeom({});
    }
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
    if (width == DIV_A_WIDTH) {
        ui->divAWidth->setChecked(true);
    } else if (width == DIV_B_WIDTH) {
        ui->divBWidth->setChecked(true);
    } else {
        ui->customWidth->setChecked(true);
    }
}

void VirtualFieldSetupDialog::heightChanged(double height)
{
    if (height == DIV_A_HEIGHT) {
        ui->divAHeight->setChecked(true);
    } else if (height == DIV_B_HEIGHT) {
        ui->divBHeight->setChecked(true);
    } else {
        ui->customHeight->setChecked(true);
    }
}
