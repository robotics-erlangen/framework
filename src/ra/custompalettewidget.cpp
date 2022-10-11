/***************************************************************************
 *   Copyright 2022 Michel Schmid                       *
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

#include "custompalettewidget.h"
#include "ui_custompalettewidget.h"

#include <QColorDialog>
#include <QSettings>

CustomPaletteWidget::CustomPaletteWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::CustomPaletteWidget)
{
    ui->setupUi(this);
    connect(ui->foregroundColor, &QAbstractButton::clicked, this, &CustomPaletteWidget::chooseForegroundColor);
    connect(ui->backgroundColor, &QAbstractButton::clicked, this, &CustomPaletteWidget::chooseBackgroundColor);
    connect(ui->alternateBackgroundColor, &QAbstractButton::clicked, this, &CustomPaletteWidget::chooseAlternateBackgroundColor);
    connect(ui->disabledColor, &QAbstractButton::clicked, this, &CustomPaletteWidget::chooseDisabledColor);
    connect(ui->highlightColor, &QAbstractButton::clicked, this, &CustomPaletteWidget::chooseHighlightColor);
    connect(ui->linkColor, &QAbstractButton::clicked, this, &CustomPaletteWidget::chooseLinkColor);
}

CustomPaletteWidget::~CustomPaletteWidget()
{
    delete ui;
}

// update style sheet overrides palette so this avoids resetting the color when setting the palette
static void updateStyleSheet(QPushButton* button, const QColor& color) {
    QString ss("QPushButton { background-color: %1; border: 5px solid %2; border-radius: 10px; }");
    button->setStyleSheet(ss.arg(color.name()).arg(Qt::gray));
}

void CustomPaletteWidget::save() {
    QSettings s;
    s.setValue("Ui/CustomPalette/Foreground", m_palette.foreground);
    s.setValue("Ui/CustomPalette/Background", m_palette.background);
    s.setValue("Ui/CustomPalette/AltBackground", m_palette.alternateBackground);
    s.setValue("Ui/CustomPalette/Disabled", m_palette.disabled);
    s.setValue("Ui/CustomPalette/Highlight", m_palette.highlight);
    s.setValue("Ui/CustomPalette/Link", m_palette.link);
}

void CustomPaletteWidget::load() {
    QSettings s;
    if (s.contains("Ui/CustomPalette/Foreground")) {
        const QColor foreground(s.value("Ui/CustomPalette/Foreground").toString());
        const QColor background(s.value("Ui/CustomPalette/Background").toString());
        const QColor alternatebackground(s.value("Ui/CustomPalette/AltBackground").toString());
        const QColor disabled(s.value("Ui/CustomPalette/Disabled").toString());
        const QColor highlight(s.value("Ui/CustomPalette/Highlight").toString());
        const QColor link(s.value("Ui/CustomPalette/Link").toString());
        m_palette = { foreground, background, alternatebackground, disabled, highlight, link };
    } else {
        const QColor foreground(35, 38, 41);
        const QColor background(239, 240, 241);
        const QColor alternateBackground(189, 195, 197);
        const QColor disabled(127, 140, 141);
        const QColor highlight(61, 174, 233);
        const QColor link(41, 128, 185);
        m_palette = { foreground, background, alternateBackground, disabled, highlight, link };
    }

    std::array<std::tuple<QPushButton*, std::reference_wrapper<QColor>>, 6> buttonColorPairs{
        {{ ui->foregroundColor, std::ref(m_palette.foreground) },
        { ui->backgroundColor, std::ref(m_palette.background) },
        { ui->alternateBackgroundColor, std::ref(m_palette.alternateBackground) },
        { ui->disabledColor, std::ref(m_palette.disabled) },
        { ui->highlightColor, std::ref(m_palette.highlight) },
        { ui->linkColor, std::ref(m_palette.link) }
    }};

    for (auto [button, color] : buttonColorPairs) {
        updateStyleSheet(button, color);
    }
}

void CustomPaletteWidget::chooseColor(QPushButton* button, const QLabel* label, QColor& color) {
    const QColor newColor = QColorDialog::getColor(color, this, label->text());

    if (newColor.isValid()) {
        color = newColor;
        updateStyleSheet(button, color);
    }
}

void CustomPaletteWidget::chooseForegroundColor(bool) {
    chooseColor(ui->foregroundColor, ui->colorLabel0, m_palette.foreground);
}

void CustomPaletteWidget::chooseBackgroundColor(bool) {
    chooseColor(ui->backgroundColor, ui->colorLabel1, m_palette.background);
}

void CustomPaletteWidget::chooseAlternateBackgroundColor(bool) {
    chooseColor(ui->alternateBackgroundColor, ui->colorLabel2, m_palette.alternateBackground);
}

void CustomPaletteWidget::chooseDisabledColor(bool) {
    chooseColor(ui->disabledColor, ui->colorLabel3, m_palette.disabled);
}

void CustomPaletteWidget::chooseHighlightColor(bool) {
    chooseColor(ui->highlightColor, ui->colorLabel4, m_palette.highlight);
}

void CustomPaletteWidget::chooseLinkColor(bool) {
    chooseColor(ui->linkColor, ui->colorLabel5, m_palette.link);
}
