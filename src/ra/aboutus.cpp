/***************************************************************************
 *   Copyright 2021 Michel Schmid
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

#include "aboutus.h"
#include "ui_aboutus.h"

#include "git/gitconfig.h"

#include <QRegularExpression>

AboutUs::AboutUs(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::AboutUs)
{
    ui->setupUi(this);
    ui->commitLabel->setText(gitconfig::getErforceCommitHash());

    const QString diffText(gitconfig::getErforceCommitDiff());
    QString escaped = diffText.toHtmlEscaped();
    for (int i = 0;i<2;i++) {
        escaped.replace(QRegularExpression("\n\\+(.*|)\n"), "\n<font color=\"green\">+\\1</font>\n");
        escaped.replace(QRegularExpression("\n\\-(.*|)\n"), "\n<font color=\"red\">-\\1</font>\n");
    }
    ui->diffText->setHtml(QString("<pre>%1</pre>").arg(escaped));
}

AboutUs::~AboutUs()
{
    delete ui;
}
