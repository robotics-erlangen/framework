/***************************************************************************
 *   Copyright 2016 Michael Eischer                                        *
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

#include "optionswidget.h"
#include "ui_optionswidget.h"
#include <QSortFilterProxyModel>
#include <QStandardItemModel>

OptionsWidget::OptionsWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::OptionsWidget)
{
    ui->setupUi(this);

    // create item model
    m_model = new QStandardItemModel(this);
    ui->list->setUniformItemSizes(true); // speed up
    ui->list->setModel(m_model);
    connect(m_model, SIGNAL(itemChanged(QStandardItem*)), SLOT(itemChanged(QStandardItem*)));
}

OptionsWidget::~OptionsWidget()
{
    delete ui;
}

void OptionsWidget::handleStrategyStatus(const amun::StatusStrategy &strategy)
{
    bool changed = false;
    for (const std::string &stdOption: strategy.option()) {
        // avoid conversion to QString if not really neccessary
        const QByteArray option(stdOption.data(), stdOption.size());

        QStandardItem *&item = m_items[option];
        // add item if neccessary
        if (item == NULL) {
            changed = true;
            item = new QStandardItem(QString::fromStdString(stdOption));
            item->setCheckable(true);
            m_selection.insert(item->text());
            item->setCheckState(Qt::Checked);
            m_model->appendRow(item);
            // new options are rarely added, just sort everything
            m_model->sort(0);
        }
    }
    if (changed) {
        sendItemsChanged();
    }
}

void OptionsWidget::handleStatus(const Status &status)
{
    if (status->has_status_strategy()) {
        handleStrategyStatus(status->status_strategy().status());
    }
}

void OptionsWidget::sendItemsChanged()
{
    Command command(new amun::Command);
    amun::CommandStrategySetOptions *opts =
            command->mutable_strategy_yellow()->mutable_options();
    for (const QString &option: m_selection) {
        std::string *stdopt = opts->add_option();
        *stdopt = option.toStdString();
    }

    command->mutable_strategy_blue()->CopyFrom(command->strategy_yellow());
    command->mutable_strategy_autoref()->CopyFrom(command->strategy_yellow());
    emit sendCommand(command);
}

void OptionsWidget::itemChanged(QStandardItem *item)
{
    bool changed = false;
    const QString name = item->text();
    // update selection
    if (item->checkState() == Qt::Checked) {
        if (!m_selection.contains(name)) {
            m_selection.insert(name);
            changed = true;
        }
    } else {
        if (m_selection.remove(name)) {
            changed = true;
        }
    }

    if (changed) {
        sendItemsChanged();
    }
}
