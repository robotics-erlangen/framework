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

#ifndef GITINFOWIDGET_H
#define GITINFOWIDGET_H

#include <QWidget>

namespace Ui {
class GitInfoWidget;
}

class GitInfoWidget : public QWidget
{
    Q_OBJECT

public:
    explicit GitInfoWidget(QWidget *parent = nullptr);
    ~GitInfoWidget();
    void updateGitInfo(const std::string& hash, const std::string& diff, const std::string& min_hash, const std::string& error);
	void updateWidget();
    void load();
    void changeReplayMode(const bool playback);

public:
	QString name;

private:
    void save();

private:
    Ui::GitInfoWidget *ui;
    std::string m_hash, m_diff, m_min_hash, m_error, m_relativePath, m_diffHash;
	bool showOrigDiff = true;

private slots:
	void updateRelativePath();
	void updateDiffHash(int index);
	void updateCustomDiffHash();
};

#endif // GITINFOWIDGET_H
