/***************************************************************************
 *   Copyright 2023 Paul Bergmann                                          *
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
#include "automaticentrypointdialog.h"
#include "ui_automaticentrypointdialog.h"

#include "automaticentrypointsstorage.h"
#include "entrypointselectiontoolbutton.h"
#include <QCheckBox>
#include <QString>
#include <QVector>

AutomaticEntrypointDialog::AutomaticEntrypointDialog(const AutomaticEntrypointsStorage& selectedEntrypoints, const QVector<QString> &allEntrypoints, amun::StatusStrategyWrapper::StrategyType type, QWidget *parent) :
    QDialog(parent),
    ui(new Ui::AutomaticEntrypointDialog),
    m_selectedEntrypoints(selectedEntrypoints)
{
    ui->setupUi(this);

    setFixedSize(size());

    EntrypointSelectionToolButton *gameEntrypoint = new EntrypointSelectionToolButton { type, this };
    addEntrypointSelection(0, ui->enableGame, gameEntrypoint, allEntrypoints, m_selectedEntrypoints.forGame);

    EntrypointSelectionToolButton *breakEntrypoint = new EntrypointSelectionToolButton { type, this };
    addEntrypointSelection(1, ui->enableBreak, breakEntrypoint, allEntrypoints, m_selectedEntrypoints.forBreak);

    EntrypointSelectionToolButton *postgameEntrypoint = new EntrypointSelectionToolButton { type, this };
    addEntrypointSelection(2, ui->enablePostgame, postgameEntrypoint, allEntrypoints, m_selectedEntrypoints.forPostgame);
}

void AutomaticEntrypointDialog::addEntrypointSelection(int row, QCheckBox *enabledBox, EntrypointSelectionToolButton *toolButton, const QVector<QString> &allEntrypoints, QString &valueStorage)
{
    ui->gridLayout->addWidget(toolButton, row, 1);
    toolButton->setEntrypointList(allEntrypoints);
    toolButton->setVisible(true);
    toolButton->setCurrentEntrypoint(valueStorage);

    connect(enabledBox, &QCheckBox::toggled, toolButton, &EntrypointSelectionToolButton::setEnabled);

    enabledBox->setChecked(!valueStorage.isNull());
    toolButton->setEnabled(!valueStorage.isNull());

    connect(enabledBox, &QCheckBox::toggled, toolButton, [&valueStorage, toolButton](bool checked) {
        toolButton->setEnabled(checked);
        if (!checked) {
            valueStorage = QString{};
        }
    });

    connect(toolButton, &EntrypointSelectionToolButton::entrypointSelected, this, [&valueStorage, toolButton](const QString &selected) {
        toolButton->setCurrentEntrypoint(selected);
        valueStorage = selected;
    });
}

AutomaticEntrypointDialog::~AutomaticEntrypointDialog()
{
    delete ui;
}
