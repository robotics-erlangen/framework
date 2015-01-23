/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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

#include "debughelper.h"
#include "protobuf/debug.pb.h"

/*!
 * \brief Helper function to draw a colored line in the GUI showing the playfield.
 * \param debug Pointer to amun::DebugValues to be used as debugging interface
 * \param x1 x-coordinate of first point
 * \param y1 y-coordinate of first point
 * \param x2 x-coordinate of second point
 * \param y2 y-coordinate of second point
 * \param r RGB Color (red)
 * \param g RGB Color (green)
 * \param b RGB Color (blue)
 * \param w Width of line
 * \param visualizationCategory A string containing the category for visualization in GUI, standard is "Controller"
 */
void DebugHelper::drawLine(amun::DebugValues *debug, float x1, float y1, float x2, float y2,
                           int r, int g, int b, float w, const char *visualizationCategory)
{
    amun::Visualization *vis = debug->add_visualization();
    vis->set_name(visualizationCategory);
    vis->set_width(w);
    amun::Pen *pen = vis->mutable_pen();
    amun::Color *color = pen->mutable_color();
    color->set_red(r);
    color->set_green(g);
    color->set_blue(b);
    amun::Path *path = vis->mutable_path();
    amun::Point *p;
    p = path->add_point();
    p->set_x(x1);
    p->set_y(y1);
    p = path->add_point();
    p->set_x(x2);
    p->set_y(y2);
}
