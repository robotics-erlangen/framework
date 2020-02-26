/***************************************************************************
 *   Copyright 2015 Alexander Danzer, Michael Eischer, Philipp Nordhus     *
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

#include "geometry.h"

void geometrySetDefault(world::Geometry *geometry, bool useQuadField)
{
    geometry->set_line_width(0.01f);
    geometry->set_field_width((useQuadField) ? 9.00f : 6.00f);
    geometry->set_field_height((useQuadField) ? 12.00f : 9.00f);
    geometry->set_boundary_width((useQuadField) ? 0.30f : 0.25f);
    geometry->set_goal_width((useQuadField) ? 1.20f : 1.00f);
    geometry->set_goal_depth(0.18f);
    geometry->set_goal_wall_width(0.02f);
    geometry->set_center_circle_radius(0.50f);
    geometry->set_defense_radius((useQuadField) ? 1.20f : 1.00f);
    geometry->set_defense_stretch((useQuadField) ? 2.4f : 0.50f);
    geometry->set_free_kick_from_defense_dist(0.20f);
    geometry->set_penalty_spot_from_field_line_dist((useQuadField) ? 1.20f : 1.00f);
    geometry->set_penalty_line_from_spot_dist(0.40f);
    geometry->set_defense_width((useQuadField) ? 2.40f : 2.00f);
    geometry->set_defense_height((useQuadField) ? 1.20f : 1.00f);
    geometry->set_goal_height(0.155f);
    geometry->set_type(useQuadField ? world::Geometry::TYPE_2018 : world::Geometry::TYPE_2014);
    assert(geometry->IsInitialized());
}
