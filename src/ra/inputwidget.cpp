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

#include "inputwidget.h"
#include "input/inputmanager.h"
#include "ui_inputwidget.h"
#include <QSettings>

InputWidget::InputWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::InputWidget)
{
    ui->setupUi(this);
}

InputWidget::~InputWidget()
{
    saveConfig();
    delete ui;
}

void InputWidget::saveConfig()
{
    QSettings s;
    s.beginGroup("Input");
    s.setValue("SpeedLinear", ui->spinLinear->value());
    s.setValue("SpeedRotation", ui->spinRotation->value());
    s.setValue("Global", ui->checkGlobal->isChecked());
    s.setValue("Deadzone", ui->gamepadDeadzone->value());
    s.endGroup();
}

void InputWidget::init(InputManager *inputManager)
{
    connect(ui->spinLinear, SIGNAL(valueChanged(double)), inputManager, SLOT(setMaxSpeed(double)));
    connect(ui->spinRotation, SIGNAL(valueChanged(double)), inputManager, SLOT(setMaxOmega(double)));
    connect(ui->checkGlobal, SIGNAL(toggled(bool)), inputManager, SLOT(setGlobal(bool)));
    connect(ui->dribblerPower, SIGNAL(valueChanged(double)), inputManager, SLOT(setDribblerPower(double)));
    connect(ui->shootPower, SIGNAL(valueChanged(double)), inputManager, SLOT(setShootPower(double)));
#ifdef SDL2_FOUND
    connect(ui->gamepadDeadzone, SIGNAL(valueChanged(double)), inputManager, SLOT(setDeadzone(double)));
#else
    ui->gamepadDeadzone->setHidden(true);
    ui->label_5->setHidden(true);
#endif // SDL2_FOUND
}

void InputWidget::load()
{
    QSettings s;
    s.beginGroup("Input");
    ui->spinLinear->setValue(s.value("SpeedLinear", 1.0).toDouble());
    ui->spinRotation->setValue(s.value("SpeedRotation", 1.0).toDouble());
    ui->checkGlobal->setChecked(s.value("Global").toBool());
    ui->gamepadDeadzone->setValue(s.value("Deadzone", 0.02).toDouble());
    s.endGroup();
}
