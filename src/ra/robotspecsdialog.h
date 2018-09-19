/***************************************************************************
 *   Copyright 2015 Philipp Nordhus                                        *
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

#ifndef ROBOTSPECSDIALOG_H
#define ROBOTSPECSDIALOG_H

#include "protobuf/robot.pb.h"
#include <QDialog>

class QStandardItem;
class QStandardItemModel;

namespace Ui {
class RobotSpecsDialog;
}

class RobotSpecsDialog : public QDialog
{
    Q_OBJECT

public:
    explicit RobotSpecsDialog(const robot::Specs &specs, const robot::Specs &def, QWidget *parent = 0);
    explicit RobotSpecsDialog(const robot::Specs &specs, QWidget *parent = 0);
    ~RobotSpecsDialog() override;
    RobotSpecsDialog(const RobotSpecsDialog&) = delete;
    RobotSpecsDialog& operator=(const RobotSpecsDialog&) = delete;

public:
    const robot::Specs& specs() const { return m_specs; }

private slots:
    void itemChanged(QStandardItem *item);

private:
    void init(const robot::Specs *def);
    void fillTree(QStandardItem *parent, google::protobuf::Message *specs, const google::protobuf::Message *def);
    static QVariant getData(const google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field);

private:
    Ui::RobotSpecsDialog *ui;
    QStandardItemModel *m_model;
    robot::Specs m_specs;
    bool m_robot;
    bool m_blockItemChanged;
};

#endif // ROBOTSPECSDIALOG_H
