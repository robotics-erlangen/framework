/***************************************************************************
 *   Copyright 2019 Andreas Wendler                                        *
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

#ifndef TRAJECTORYSAMPLER_H
#define TRAJECTORYSAMPLER_H

#include "alphatimetrajectory.h"
#include "worldinformation.h"
#include "speedprofile.h"
#include "pathdebug.h"
#include "trajectoryinput.h"
#include "core/vector.h"
#include <vector>

class RNG;

class TrajectorySampler {
public:
    TrajectorySampler(RNG *rng, const WorldInformation &world, PathDebug &debug) :
        m_rng(rng),
        m_world(world),
        m_debug(debug) {}

    virtual ~TrajectorySampler() {}
    // returns true on finding a valid trajectory
    virtual bool compute(const TrajectoryInput &input) = 0;
    virtual const std::vector<Trajectory> &getResult() const = 0;

protected:
    RNG *m_rng;
    const WorldInformation &m_world;
    PathDebug &m_debug;
};

#endif // TRAJECTORYSAMPLER_H
