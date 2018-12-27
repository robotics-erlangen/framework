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

#ifndef VIRTUALFIELDSETUPDIALOG_H
#define VIRTUALFIELDSETUPDIALOG_H

#include <QDialog>
#include <array>
#include "protobuf/world.pb.h"

namespace Ui {
class VirtualFieldSetupDialog;
}

struct VirtualFieldConfiguration {
    bool enabled = false;
    world::Geometry geometry;
    // from vision space to virtual space (affine linear)
    // first the four entries of the matrix, then the offset vector
    std::array<float, 6> transform;

    // to restore the internal state again
    int goalId = 10;
    float width = 9, height = 12;

    enum GoalOrDefenseType {
        QUAD_SIZE, DOUBLE_SIZE, FROM_REAL
    };
    GoalOrDefenseType goalType = GoalOrDefenseType::FROM_REAL;
    GoalOrDefenseType defenseType = GoalOrDefenseType::QUAD_SIZE;
};

class VirtualFieldSetupDialog : public QDialog
{
    Q_OBJECT

public:
    explicit VirtualFieldSetupDialog(const VirtualFieldConfiguration &start, QWidget *parent = nullptr);
    ~VirtualFieldSetupDialog();
    VirtualFieldConfiguration getResult(const world::Geometry &realGeometry);

protected slots:
    void widthChanged(double width);
    void heightChanged(double height);

private slots:
    void adaptGoalBoxVisibility();

private:
    Ui::VirtualFieldSetupDialog *ui;

    const double QUAD_SIZE_WIDTH = 9;
    const double DOUBLE_SIZE_WIDTH = 4.5;
    const double QUAD_SIZE_HEIGHT = 12;
    const double DOUBLE_SIZE_HEIGHT = 6;
};

#endif // VIRTUALFIELDSETUPDIALOG_H
