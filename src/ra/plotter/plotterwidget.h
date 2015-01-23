/***************************************************************************
 *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

#ifndef PLOTTERWIDGET_H
#define PLOTTERWIDGET_H

#include <QGLWidget>
#include <QHash>
#include <QMap>

class Plot;

class PlotterWidget : public QGLWidget
{
    Q_OBJECT

public:
    explicit PlotterWidget(QWidget *parent = 0);

public:
    void update(float time);

public slots:
    void addPlot(const Plot *plot);
    void removePlot(const Plot *plot);

    void setYMin(double yMin);
    void setYMax(double yMax);
    void setDuration(double duration);
    void setOffset(double offset);

protected:
    void paintGL();
    void leaveEvent(QEvent *e);
    void mouseMoveEvent(QMouseEvent *e);
    void mousePressEvent(QMouseEvent *);
    void mouseReleaseEvent(QMouseEvent *);

private slots:
    void updateView();

private:
    void drawCoordSys();
    void drawHelpers();
    void drawLabel(int x, int y, bool rightAligned, const QString &str);

    QPointF mapToScene(const QPoint &pos);
    QPointF mapFromScene(double x, double y, double z);

    void renderText(int x, int y, const QString & str);
    void renderText(double x, double y, double z, const QString & str);

private:
    QMap<QString, const Plot*> m_plots;
    QHash<const Plot*, QColor> m_colorMap;
    QList<QColor> m_colorQueue;
    QFont m_font;

    double m_time;
    bool m_isUpdated;
    double m_yMin;
    double m_yMax;
    double m_duration;
    double m_offset;

    bool m_showTime;
    QPointF m_mouseStartPos;
    QPointF m_mouseEndPos;
    QPointF m_mousePos;
    bool m_drawMeasurementHelper;

    static const QList<QColor> m_colors;
};

#endif // PLOTTERWIDGET_H
