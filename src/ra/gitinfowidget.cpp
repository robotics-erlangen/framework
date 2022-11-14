/***************************************************************************
 *   Copyright 2022 Michel Schmid
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

#include "gitinfowidget.h"
#include "ui_gitinfowidget.h"
#include "git/gitconfig.h"

#include <QSettings>

enum class DiffOptions {
    ORIGINAL, MIN_HASH, HEAD, MASTER, CUSTOM
};

Q_DECLARE_METATYPE(DiffOptions)

GitInfoWidget::GitInfoWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::GitInfoWidget)
{
    ui->setupUi(this);
    ui->diffToComboBox->addItem("original", qVariantFromValue(DiffOptions::ORIGINAL));
    ui->diffToComboBox->addItem("min hash", qVariantFromValue(DiffOptions::MIN_HASH));
    ui->diffToComboBox->addItem("HEAD", qVariantFromValue(DiffOptions::HEAD));
    ui->diffToComboBox->addItem("master", qVariantFromValue(DiffOptions::MASTER));
    ui->diffToComboBox->addItem("custom", qVariantFromValue(DiffOptions::CUSTOM));
    ui->customDiffHashLabel->setEnabled(false);
    ui->customDiffHashEdit->setEnabled(false);

    connect(ui->diffToComboBox, SIGNAL(currentIndexChanged(int)), this, SLOT(updateDiffHash(int)));
    connect(ui->relativePathEdit, SIGNAL(editingFinished()), this, SLOT(updateRelativePath()));
    connect(ui->customDiffHashEdit, SIGNAL(editingFinished()), this, SLOT(updateCustomDiffHash()));
}

GitInfoWidget::~GitInfoWidget()
{
    save();
    delete ui;
}

void GitInfoWidget::updateGitInfo(const std::string& newHash, const std::string& newDiff, const std::string& newMin_hash, const std::string& newError)
{
    m_hash = newHash;
    m_diff = newDiff;
    m_min_hash = newMin_hash;
    m_error = newError;
    updateWidget();
}

void GitInfoWidget::updateWidget()
{
    ui->hashLabel->setText("Hash: " + QString::fromStdString(m_hash));

    QString diffText;
    if (showOrigDiff) {
        diffText = QString::fromStdString(m_diff);
    } else {
        const auto newDiff = gitconfig::calculateDiff(m_relativePath.c_str(), m_hash.c_str(), m_diff.c_str(), m_diffHash.c_str());
        diffText = QString::fromStdString(newDiff);
    }

    QString escaped = diffText.toHtmlEscaped();
    for (int i = 0;i<2;i++) {
        escaped.replace(QRegularExpression("\n\\+(.*|)\n"), "\n<font color=\"green\">+\\1</font>\n");
        escaped.replace(QRegularExpression("\n\\-(.*|)\n"), "\n<font color=\"red\">-\\1</font>\n");
    }
    ui->diffText->setHtml(QString("<pre>%1</pre>").arg(escaped));
}

void GitInfoWidget::updateRelativePath()
{
    m_relativePath = ui->relativePathEdit->text().toStdString();
    updateWidget();
}

void GitInfoWidget::updateDiffHash(int index)
{
    showOrigDiff = false;
    ui->customDiffHashLabel->setEnabled(false);
    ui->customDiffHashEdit->setEnabled(false);

    const auto diffOption = ui->diffToComboBox->itemData(index).value<DiffOptions>();
    switch (diffOption) {
        case DiffOptions::ORIGINAL:
            showOrigDiff = true;
            break;
        case DiffOptions::MIN_HASH:
            m_diffHash = m_min_hash;
            break;
        case DiffOptions::HEAD:
            m_diffHash = gitconfig::getErforceCommitHash();
            break;
        case DiffOptions::MASTER:
            m_diffHash = gitconfig::getErforceReliableCommitHash();
            break;
        case DiffOptions::CUSTOM:
            ui->customDiffHashLabel->setEnabled(true);
            ui->customDiffHashEdit->setEnabled(true);
            m_diffHash = ui->customDiffHashEdit->text().toStdString();
            break;
    }
    updateWidget();
}

void GitInfoWidget::updateCustomDiffHash()
{
    m_diffHash = ui->customDiffHashEdit->text().toStdString();
    updateWidget();
}

void GitInfoWidget::save()
{
    const auto pathName = "GitInfo/" + name;
    QSettings s;
    s.setValue(pathName + "/relativePath", ui->relativePathEdit->text());
    s.setValue(pathName + "/customDiffHash", ui->customDiffHashEdit->text());
    s.setValue(pathName + "/diffToComboBox", ui->diffToComboBox->currentIndex());
}

void GitInfoWidget::load()
{
    const auto pathName = "GitInfo/" + name;
    QSettings s;
    ui->relativePathEdit->setText(s.value(pathName + "/relativePath").toString());
    m_relativePath = ui->relativePathEdit->text().toStdString();
    ui->customDiffHashEdit->setText(s.value(pathName + "/customDiffHash").toString());
    m_diffHash = ui->customDiffHashEdit->text().toStdString();
    ui->diffToComboBox->setCurrentIndex(s.value(pathName + "/diffToComboBox").toInt());
    updateWidget();
}

void GitInfoWidget::changeReplayMode(const bool hide)
{
    if (hide) {
        ui->hashLabel->setText("No git information found (yet)!");
        ui->diffText->setText("");
    } else {
        updateWidget();
    }
}
