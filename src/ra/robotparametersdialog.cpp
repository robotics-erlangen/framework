/***************************************************************************
 *   Copyright 2014 Michael Eischer, Jan Kallwies, Philipp Nordhus         *
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

#include "robotparametersdialog.h"
#include "ui_robotparametersdialog.h"
#include "protobuf/command.pb.h"
#include <QPushButton>
#include <QSettings>

RobotParametersDialog::RobotParametersDialog(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::RobotParametersDialog)
{
    ui->setupUi(this);

    connect(ui->buttonBox->button(QDialogButtonBox::Apply), SIGNAL(clicked()), SLOT(send()));

    QSettings s;

    s.beginGroup("RobotParameters");
    ui->spinK0->setValue(s.value("K0", 125*20).toInt());
    ui->spinK1->setValue(s.value("K1", 125*20).toInt());
    ui->spinK2->setValue(s.value("K2", 250*20).toInt());
    ui->spinI0->setValue(s.value("I0", 10*20).toInt());
    ui->spinI1->setValue(s.value("I1", 10*20).toInt());
    ui->spinI2->setValue(s.value("I2", 5*20).toInt());
    ui->spinD0->setValue(s.value("D0", 0).toInt());
    ui->spinD1->setValue(s.value("D1", 0).toInt());
    ui->spinD2->setValue(s.value("D2", 0).toInt());
    ui->spinMaxErrorsumX ->setValue(s.value("max_errorsum_x", 1000).toInt());
    ui->spinMaxErrorsumY->setValue(s.value("max_errorsum_y", 1000).toInt());
    ui->spinMaxErrorsumPhi->setValue(s.value("max_errorsum_phi", 1000).toInt());

    ui->spinVC_x_front->setValue(s.value("vc_x_front", 2612).toInt());
    ui->spinVC_x_rear->setValue(s.value("vc_x_rear", 3422).toInt());
    ui->spinVC_y_front->setValue(s.value("vc_y_front", 1892).toInt());
    ui->spinVC_y_rear->setValue(s.value("vc_y_rear", 1433).toInt());

    s.endGroup();
}

RobotParametersDialog::~RobotParametersDialog()
{
    QSettings s;
    s.beginGroup("RobotParameters");
    s.setValue("K0",ui->spinK0->value());
    s.setValue("K1",ui->spinK1->value());
    s.setValue("K2",ui->spinK2->value());
    s.setValue("I0",ui->spinI0->value());
    s.setValue("I1",ui->spinI1->value());
    s.setValue("I2",ui->spinI2->value());
    s.setValue("D0",ui->spinD0->value());
    s.setValue("D1",ui->spinD1->value());
    s.setValue("D2",ui->spinD2->value());
    s.setValue("max_errorsum_x",ui->spinMaxErrorsumX->value());
    s.setValue("max_errorsum_y",ui->spinMaxErrorsumY->value());
    s.setValue("max_errorsum_phi",ui->spinMaxErrorsumPhi->value());

    s.setValue("vc_x_front",ui->spinVC_x_front->value());
    s.setValue("vc_x_rear",ui->spinVC_x_rear->value());
    s.setValue("vc_y_front",ui->spinVC_y_front->value());
    s.setValue("vc_y_rear",ui->spinVC_y_rear->value());
    s.endGroup();
    delete ui;
}

void RobotParametersDialog::send()
{
    Command command(new amun::Command);
    robot::RadioParameters *parameters = command->mutable_robot_parameters();

    // controller
    parameters->add_p(ui->spinK0->value());
    parameters->add_p(ui->spinK1->value());
    parameters->add_p(ui->spinK2->value());
    parameters->add_p(ui->spinI0->value());
    parameters->add_p(ui->spinI1->value());
    parameters->add_p(ui->spinI2->value());
    parameters->add_p(ui->spinD0->value());
    parameters->add_p(ui->spinD1->value());
    parameters->add_p(ui->spinD2->value());

    // max error sum
    parameters->add_p(ui->spinMaxErrorsumX->value());
    parameters->add_p(ui->spinMaxErrorsumY->value());
    parameters->add_p(ui->spinMaxErrorsumPhi->value());

    // velocity_coupling matrix
    parameters->add_p(ui->spinVC_x_front->value());
    parameters->add_p(ui->spinVC_x_rear->value());
    parameters->add_p(ui->spinVC_y_front->value());
    parameters->add_p(ui->spinVC_y_rear->value());

    emit sendCommand(command);
}
