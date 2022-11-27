/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#include "plotterwidget.h"
#include "plot.h"
#include "guihelper/guitimer.h"
#include <QCursor>
#include <QLabel>
#include <QWindow>
#include <QMouseEvent>
#include <QScrollBar>
#include <cmath>
#include <QGuiApplication>
#ifdef Q_OS_MAC
#include <OpenGL/glu.h>
#else
#include <GL/glu.h>
#endif

const QList<QColor> PlotterWidget::m_colors = QList<QColor>()
        << "red"
        << "blue"
        << "darkgreen"
        << "magenta"
        << "orange"
        << "cyan"
        << "black"
        << "gray";

PlotterWidget::PlotterWidget(QWidget *parent) :
    QOpenGLWidget(parent),
    m_font(QGuiApplication::font()),
    m_time(0.0),
    m_yMin(-5.0),
    m_yMax(5.0),
    m_duration(20.0),
    m_offset(0.0),
    m_drawMeasurementHelper(false)
{
    setMouseTracking(true);
    setCursor(Qt::CrossCursor);

    m_colorQueue = m_colors;

    // redraw timer
    m_guiTimer = new GuiTimer(30, this);
    connect(m_guiTimer, &GuiTimer::timeout, this, &PlotterWidget::updateView);
    m_guiTimer->requestTriggering();
}

PlotterWidget::~PlotterWidget()
{
}

void PlotterWidget::updateView()
{
    if (!isVisible()) {
        return;
    }
    QWidget::update();
}

void PlotterWidget::paintGL()
{
    m_painter.begin(this);
    m_painter.beginNativePainting();

    if (m_yMin == m_yMax) {
        return;
    }
    qreal dpr = (window() && window()->windowHandle()) ? window()->windowHandle()->devicePixelRatio() : 1.0;
    glViewport(0, 0, width() * dpr, height() * dpr);

    glClearColor(1.0f, 1.0f, 1.0f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);

    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();

    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();

    // mapping to viewport, accounts for the offset
    glOrtho(m_time - m_duration + m_offset, m_time + m_offset, m_yMin, m_yMax, -1, 1);

    drawCoordSys();

    // draw plots and add the corresponding label
    int numPlots = 0;
    foreach (const Plot *plot, m_plots) {
        plot->plot(m_colorMap[plot]);
        numPlots++;
        prepareRenderText(10, 20 * numPlots, plot->name(), m_colorMap[plot]);
    }

    if (m_drawMeasurementHelper) {
        drawHelpers();
    }

    if (m_showTime) {
        QString posString = QString("(%1 %2)").arg(QString::number(m_mousePos.x(), 'f', 4),
                                                   QString::number(m_mousePos.y(), 'f', 4));
        drawLabel(width(), height(), true, posString);
    }

    m_painter.endNativePainting();

    // draw texts after native OpenGL calls to not confuse the QPainter object
    m_painter.setBackgroundMode(Qt::TransparentMode);
    renderTexts();

    m_painter.end();
}

void PlotterWidget::drawCoordSys()
{
    // subgrid
    glColor3f(0.90, 0.90, 0.90);
    glBegin(GL_LINES);

    float unitHeight = height() / (m_yMax - m_yMin); // heigth of one grid cell
    int maxHoriz = unitHeight / 20; // at most one line per 25 px
    int subGridHoriz = std::pow(10, std::floor(std::log10(maxHoriz)));
    if (subGridHoriz > 0) {
        float subHeight = 1.f / subGridHoriz;

        // horizontal lines
        for (float i = m_yMin; i <= m_yMax; i += subHeight) {
            float lineY = floorf(i*subGridHoriz)/subGridHoriz;
            glVertex2d(m_time - m_duration + m_offset, lineY);
            glVertex2d(m_time + m_offset, lineY);
        }
    }

    float unitWidth = width() / m_duration; // width of one grid cell
    int maxVert = unitWidth / 20; // at most one line per 25 px
    int subGridCount = std::pow(10, std::floor(std::log10(maxVert)));
    if (subGridCount > 0) {
        float subWidth = 1.f / subGridCount;

        // vertical lines
        for (float i = -1; i <= m_duration; i += subWidth) {
            float lineX = floorf(i*subGridCount)/subGridCount;
            glVertex2d(m_time - lineX + floorf(m_offset), m_yMin);
            glVertex2d(m_time - lineX + floorf(m_offset), m_yMax);
        }
    }

    glEnd();

    // highlight unit grid
    glColor3f(0.75, 0.75, 0.75);
    glBegin(GL_LINES);
    // horizontal lines
    for (int i = 0; i < m_yMax - m_yMin + 1; i++) {
        glVertex2d(m_time - m_duration + m_offset, floorf(m_yMin) + i);
        glVertex2d(m_time + m_offset, floorf(m_yMin) + i);
    }

    // vertical lines
    for (int i = 0; i <= m_duration; i++) {
        glVertex2d(m_time - i + floorf(m_offset), m_yMin);
        glVertex2d(m_time - i + floorf(m_offset), m_yMax);
    }

    glEnd();

    for (int i = 0; i < m_yMax - m_yMin + 1; i++) {
        // add y values
        prepareRenderText(m_time - m_duration + m_offset, floorf(m_yMin) + i, 0.0f, QString::number(floorf(m_yMin) + i), QColor(127, 127, 127));
    }
}

void PlotterWidget::drawHelpers()
{
    // measurement helper
    glColor3f(0.4, 0.4, 0.4);
    glBegin(GL_LINES);

    QPointF start = m_mouseStartPos;
    // horizontal line
    glVertex2d(m_time - m_duration + m_offset, start.y());
    glVertex2d(m_time + m_offset, start.y());

    // vertical line
    glVertex2d(m_time + start.x(), m_yMin);
    glVertex2d(m_time + start.x(), m_yMax);

    QPointF end = (m_mouseEndPos.isNull()) ? m_mousePos : m_mouseEndPos;
    // horizontal line
    glVertex2d(m_time - m_duration + m_offset, end.y());
    glVertex2d(m_time + m_offset, end.y());

    // vertical line
    glVertex2d(m_time + end.x(), m_yMin);
    glVertex2d(m_time + end.x(), m_yMax);

    glEnd();

    float dy = end.y() - start.y();
    float dt = end.x() - start.x();
    QString desc = QString("dt: %1, dy: %2").arg(QString::number(dt, 'f', 4),
                                                 QString::number(dy, 'f', 4));
    if (dt != 0) {
        desc += QString(" dy/dt: %1").arg(QString::number(dy/dt, 'f', 4));
    }
    QPointF pos = mapFromScene(std::min(start.x(), end.x())+m_time, std::max(start.y(), end.y()), 0.f);

    bool rightAlignedLabel = (std::min(start.x(), end.x()) - (m_offset - m_duration)) > 0.6 * m_duration;
    drawLabel(pos.x()+2, pos.y()-2, rightAlignedLabel, desc);
}

// (x, y) is the lower left / right corner of the label
void PlotterWidget::drawLabel(int x, int y, bool rightAligned, const QString &str)
{
    // calculate text size
    QFontMetrics fm(m_font);
    QRect textSize = fm.boundingRect(str);

    // map to widget coordinates
    glPushMatrix();
    glLoadIdentity();
    glOrtho(0, width(), height(), 0, -1, 1);
    // calculate text coordinates
    const int border = std::max(4, fm.leading());
    const int textx = x - ((rightAligned) ? border + textSize.width() : -border);
    const int texty = y - border - textSize.height();
    // solid light grey background
    glColor3f(0.95, 0.95, 0.95);
    glRectf(textx - border, texty - border,
            textx + textSize.width() + border, texty + textSize.height() + border);
    // restore matrix
    glPopMatrix();
    // text in dark grey
    prepareRenderText(textx, texty + fm.ascent(), str, QColor(50, 50, 50));
}

void PlotterWidget::leaveEvent(QEvent *e)
{
    m_showTime = false;
    m_guiTimer->requestTriggering();
}

void PlotterWidget::mouseMoveEvent(QMouseEvent *e)
{
    QPointF pos = mapToScene(e->pos());
    pos.setX(pos.x() - m_time);
    m_mousePos = pos;
    m_showTime = true;
    m_guiTimer->requestTriggering();
}

void PlotterWidget::mousePressEvent(QMouseEvent *)
{
    if (m_mouseStartPos.isNull()) {
        // start showing the measurement helper
        m_drawMeasurementHelper = true;
        m_mouseStartPos = m_mousePos;
    } else {
        // hide measurement helper
        m_drawMeasurementHelper = false;
        m_mouseStartPos = QPointF();
        m_mouseEndPos = QPointF();
    }
    m_guiTimer->requestTriggering();
}

void PlotterWidget::mouseReleaseEvent(QMouseEvent *)
{
    // remember the end of the measurement rectangle
    if (!m_mouseStartPos.isNull()) {
        m_mouseEndPos = m_mousePos;
    }
}

void PlotterWidget::showEvent(QShowEvent *e)
{
    m_guiTimer->requestTriggering();
    QWidget::showEvent(e);
}

void PlotterWidget::update(float time)
{
    m_time = time; // current time, used to the time axis
    m_guiTimer->requestTriggering();
}

void PlotterWidget::addPlot(const Plot *plot)
{
    // prevent adding a plot multiple times
    // this would result in assiging a several colors to the same plot
    if (m_plots.contains(plot->name())) {
        return;
    }

    m_plots[plot->name()] = plot;
    // refill colors if required
    if (m_colorQueue.isEmpty()) {
        m_colorQueue = m_colors;
    }
    QColor color = m_colorQueue.takeFirst();
    m_colorMap[plot] = color; // remember color

    m_guiTimer->requestTriggering();
}

void PlotterWidget::removePlot(const Plot *plot)
{
    m_plots.remove(plot->name());
    if (m_colorMap.contains(plot)) {
        QColor color = m_colorMap[plot];
        m_colorMap.remove(plot);
        // return color to queue to ensure that colors are only duplicated
        // if there are more plots than different colors
        m_colorQueue.prepend(color);
    }
    m_guiTimer->requestTriggering();
}

void PlotterWidget::setYMin(double yMin)
{
    m_yMin = yMin;
    m_guiTimer->requestTriggering();
}

void PlotterWidget::setYMax(double yMax)
{
    m_yMax = yMax;
    m_guiTimer->requestTriggering();
}

void PlotterWidget::setDuration(double duration)
{
    m_duration = duration;
    m_guiTimer->requestTriggering();
}

void PlotterWidget::setOffset(double offset)
{
    m_offset = offset;
    m_guiTimer->requestTriggering();
}

qreal PlotterWidget::devicePixelRatio() const
{
    return (window() && window()->windowHandle()) ? window()->windowHandle()->devicePixelRatio() : 1.0;
}

QPointF PlotterWidget::mapToScene(const QPoint& pos)
{
    makeCurrent();
    qreal dpr = devicePixelRatio();

    GLfloat pixelDepth;
    GLdouble modelMatrix[16];
    GLdouble projectMatrix[16];
    GLint viewport[4];
    GLdouble objSpaceCoords[3];

    glGetDoublev(GL_MODELVIEW_MATRIX, modelMatrix);
    glGetDoublev(GL_PROJECTION_MATRIX, projectMatrix);
    glGetIntegerv(GL_VIEWPORT, viewport);

    glReadPixels((GLint)(pos.x()*dpr), (GLint)((height() - pos.y())*dpr), 1, 1, GL_DEPTH_COMPONENT, GL_FLOAT, &pixelDepth);

    gluUnProject(pos.x()*dpr, (height() - pos.y())*dpr, pixelDepth, modelMatrix, projectMatrix, viewport, &objSpaceCoords[0], &objSpaceCoords[1], &objSpaceCoords[2]);

    return QPointF(objSpaceCoords[0], objSpaceCoords[1]);
}

QPointF PlotterWidget::mapFromScene(double x, double y, double z)
{
    qreal dpr = devicePixelRatio();
    int height = this->height() * dpr;

    GLdouble model[4 * 4], proj[4 * 4];
    GLint view[4];
    glGetDoublev(GL_MODELVIEW_MATRIX, model);
    glGetDoublev(GL_PROJECTION_MATRIX, proj);
    glGetIntegerv(GL_VIEWPORT, view);
    GLdouble win_x = 0, win_y = 0, win_z = 0;
    gluProject(x, y, z, model, proj, view, &win_x, &win_y, &win_z);

    win_y = height - win_y; // y is inverted
    win_x /= dpr;
    win_y /= dpr;

    return QPointF(win_x, win_y);
}

// in widget coordinates!
void PlotterWidget::prepareRenderText(int x, int y, const QString & str, const QColor color)
{
    QPixmap pixmap;
    QString cacheKey = str + color.name();
    QFontMetrics fm(m_font);

    const auto texture_iterator = m_textureMap.find(cacheKey);
    if (texture_iterator == m_textureMap.end()) {
        QRect textSize = fm.boundingRect(str);
        qreal dpr = devicePixelRatio();
        pixmap = QPixmap((textSize.width()+4)*dpr, (textSize.height()+4)*dpr);
        pixmap.setDevicePixelRatio(dpr);
        pixmap.fill(Qt::transparent);
        {
            QPainter painter(&pixmap);
            painter.setFont(m_font);
            painter.setPen(color);
            painter.drawText(2, fm.ascent()+2, str);
        }
        m_textureMap.insert(cacheKey, pixmap);
    } else {
        pixmap = *texture_iterator;
    }

    QPointF pos(x-2, y-2-fm.ascent());

    m_texts.push_back({pixmap, pos});
}

void PlotterWidget::prepareRenderText(double x, double y, double z, const QString & str, const QColor color)
{
    QPointF pos = mapFromScene(x, y, z);
    prepareRenderText(pos.x(), pos.y(), str, color);
}

void PlotterWidget::renderTexts()
{
    for (const auto [pixmap, pos] : m_texts) {
        m_painter.drawPixmap(QRectF(pos, pixmap.size()/pixmap.devicePixelRatio()), pixmap, QRectF(QPointF(0, 0), pixmap.size()));
    }
    m_texts.clear();
}
