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

#ifndef CUSTOMPALETTEWIDGET_H
#define CUSTOMPALETTEWIDGET_H

#include <QWidget>
#include <QPushButton>
#include <QLabel>

namespace Ui {
class CustomPaletteWidget;
}

struct CustomPalette {
    QColor foreground;
    QColor background;
    QColor alternateBackground;
    QColor disabled;
    QColor highlight;
    QColor link;
};

class CustomPaletteWidget : public QWidget
{
    Q_OBJECT

public:
    explicit CustomPaletteWidget(QWidget *parent = nullptr);
    ~CustomPaletteWidget();
	CustomPalette getCustomPalette() const { return m_palette; };
	void save();
	void load();


private:
    Ui::CustomPaletteWidget *ui;

	void chooseColor(QPushButton* button, const QLabel* label, QColor& color);

    CustomPalette m_palette;

private slots:
	void chooseForegroundColor(bool);
	void chooseBackgroundColor(bool);
	void chooseAlternateBackgroundColor(bool);
	void chooseDisabledColor(bool);
	void chooseHighlightColor(bool);
	void chooseLinkColor(bool);
};

#endif // CUSTOMPALETTEWIDGET_H
