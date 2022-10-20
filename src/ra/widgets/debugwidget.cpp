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

#include "debugwidget.h"
#include "ui_debugwidget.h"
#include <QRegularExpression>

DebugWidget::DebugWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::DebugWidget)
{
    ui->setupUi(this);
    connect(ui->filter, SIGNAL(textChanged(QString)), SLOT(filterChanged(QString)));
    connect(ui->filter, SIGNAL(returnPressed()), ui->filter, SLOT(clear()));
    connect(ui->checkBreakOnFind, &QCheckBox::stateChanged, ui->tree, &DebugTreeWidget::setBreakOnItem);
    connect(ui->tree, &DebugTreeWidget::triggerBreak, this, &DebugWidget::triggerBreakpoint);
    m_filterDefaultStyleSheet = ui->filter->styleSheet();
    QString filterDescription = "Filter the debug tree\n"\
            "Seperate filters for key and value by using ':'\n"\
            "At the beginning of each filter, if there is a '#' present,\n"\
            "the rest of the filter will be interpreted as a regular expression.\n"\
            "If not, the value filter uses a fuzzy search.\n"\
            "In the key filter, use / at the beginning to match the start of the\n"\
            "toplevel item and in the middle to seperate hierarchy parts.\n"\
            "Use '*' to match any character beginning from the next level.\n"\
            "Everything else behaves similar to fuzzy search (should be intuitive).";
    ui->filter->setToolTip(filterDescription);
}

DebugWidget::~DebugWidget()
{
    delete ui;
}

void DebugWidget::clearData()
{
    ui->tree->clearData();
}

void DebugWidget::handleStatus(const Status &status)
{
    ui->tree->handleStatus(status);
}

void DebugWidget::setFilter(const QString &filter)
{
    ui->filter->setText(filter);
}

void DebugWidget::filterChanged(const QString &filter)
{
    const QChar FULL_REGEX_CHAR = '#';
    const QChar SEPERATOR = '/';
    const QString ESCAPED_SEPERATOR = "\\/";
    const QChar ANY_STRING = '*';

    QStringList keyValueFilter = filter.split(":");

    // create key regex
    QString keyFilter = keyValueFilter[0];
    QString keyRegex;
    if (keyFilter.length() > 0 && keyFilter[0] == FULL_REGEX_CHAR) {
        keyRegex = keyFilter.right(keyFilter.length()-1);
    } else if (keyFilter.length() > 0) {
        QRegularExpression containsNoNumbers("^[^0-9]*$");
        const QString fuzzyWithNumbersRegex = "[^"+ESCAPED_SEPERATOR+"]*";
        const QString fuzzyRegex = "[^0-9" + ESCAPED_SEPERATOR + "]*";
        bool missingFuzzyMatch = false;
        if (keyFilter.length() == 0 || keyFilter[0] != SEPERATOR) {
            keyRegex.append(".*");
        } else {
            keyFilter = keyFilter.right(keyFilter.length()-1);
            keyRegex.append("^");
            missingFuzzyMatch = true;
        }
        QStringList segments = keyFilter.split("/", QString::KeepEmptyParts);
        for (int i = 0;i<segments.size();i++) {
            QString segment = segments[i];
            QString currentFuzzyRegex = segment.contains(containsNoNumbers, nullptr) ? fuzzyWithNumbersRegex : fuzzyRegex;
            if (missingFuzzyMatch) {
                keyRegex.append(currentFuzzyRegex);
            }
            for (QChar c : segment) {
                if (c == ANY_STRING) {
                    keyRegex.append(ESCAPED_SEPERATOR + ".*");
                } else {
                    keyRegex.append(c);
                    keyRegex.append(currentFuzzyRegex);
                }
            }
            if (i != segments.size()-1) {
                keyRegex.append("/");
            }
        }
        keyRegex.append("$");
    }

    // create key regex
    QString valueFilter = filter.right(std::max(0, filter.length()-keyValueFilter[0].length()-1));
    QString valueRegex;
    if (valueFilter.length() > 0 && valueFilter[0] == FULL_REGEX_CHAR) {
        valueRegex = valueFilter.right(valueFilter.length()-1);
    } else if (valueFilter.length() > 0) {
        valueRegex = ".*";
        for (QChar c : valueFilter) {
            valueRegex.append(c);
            valueRegex.append(".*");
        }
    }

    // check if the regexs are valid
    QRegularExpression keyExpression(keyRegex, QRegularExpression::CaseInsensitiveOption);
    QRegularExpression valueExpression(valueRegex, QRegularExpression::CaseInsensitiveOption);
    if (!keyExpression.isValid() || !valueExpression.isValid()) {
        ui->filter->setStyleSheet("QLineEdit { background: rgb(255, 0, 0); selection-background-color: rgb(255, 0, 0); }");
        ui->tree->setFilterRegEx("", "");
    } else {
        ui->filter->setStyleSheet(m_filterDefaultStyleSheet);
        ui->tree->setFilterRegEx(keyRegex, valueRegex);
    }
}
