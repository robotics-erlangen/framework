/***************************************************************************
 *   Copyright 2019 Andreas Wendler                                        *
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

#include "logfileselectiondialog.h"
#include "ui_logfileselectiondialog.h"

LogFileSelectionDialog::LogFileSelectionDialog(QWidget *parent, bool filter) :
    QDialog(parent),
    ui(new Ui::LogFileSelectionDialog),
    m_filter(filter)
{
    ui->setupUi(this);
    setWindowTitle("Select Logfile");
    connect(ui->resultButtons, SIGNAL(accepted()), this, SLOT(onAccept()));
    connect(ui->resultButtons, SIGNAL(rejected()), this, SLOT(reject()));
    connect(ui->list, SIGNAL(itemDoubleClicked(QListWidgetItem*)), this, SLOT(onAccept()));
}

LogFileSelectionDialog::~LogFileSelectionDialog()
{
    delete ui;
}


static int mapQuality(logfile::LogOfferEntry::QUALITY q)
{
    switch(q) {
        case logfile::LogOfferEntry::PERFECT: return 0;
        case logfile::LogOfferEntry::UNKNOWN: return 1;
        case logfile::LogOfferEntry::UNREADABLE: return 1000;
    }
}

struct LogEntry {
    std::string path;
    std::string name;
    logfile::LogOfferEntry::QUALITY q;
    LogEntry(std::string p_path, std::string p_name, logfile::LogOfferEntry::QUALITY p_q): path(std::move(p_path)), name(std::move(p_name)), q(p_q) {}

    std::string toString() const
    {
        return name + " (" + logfile::LogOfferEntry::QUALITY_descriptor()->FindValueByNumber(q)->name() + ")";
    }

    bool operator<(const LogEntry& other) const
    {
        int q1 = mapQuality(q);
        int qO = mapQuality(other.q);
        if (q1 < qO)
            return true;
        if (q1 > qO)
            return false;
        return name < other.name;

    }
};

void LogFileSelectionDialog::setListContent(const logfile::LogOffer &l)
{
    ui->list->clear();
    m_paths = {};
    std::vector<LogEntry> items;
    items.reserve(l.entries_size());
    for (const auto& item : l.entries()) {
        if (!m_filter || item.quality() == logfile::LogOfferEntry::PERFECT) {
            items.emplace_back(item.uri().path(), item.name(), item.quality());
        }
    }
    std::sort(items.begin(), items.end());

    for(const auto& item: items) {
         ui->list->addItem(QString::fromStdString(item.toString()));
         m_paths.append(QString::fromStdString(item.path));
    }
}

void LogFileSelectionDialog::onAccept()
{
    emit resultSelected(m_paths[ui->list->currentRow()]);
    accept();
}
