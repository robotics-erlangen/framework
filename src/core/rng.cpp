/***************************************************************************
 *   Copyright 2015 Philipp Nordhus                                        *
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

#include "rng.h"
#include <cmath>
#include <cstdlib>
#include <sys/time.h>

/*!
 * \class RNG
 * \ingroup core
 * \brief Pseudorandom number generator
 *
 * http://www.iro.umontreal.ca/~lecuyer/myftp/papers/tausme.ps
 */

#define LCG(n) ((69069 * n) & 0xffffffffUL)
#define MASK 0xffffffffUL
#define TAUSWORTHE(s,a,b,c,d) (((s &c) <<d) &MASK) ^ ((((s <<a) &MASK)^s) >>b)

/*!
 * \brief Create an RNG instance
 * \param seed RNG seed
 */
RNG::RNG(uint32_t seed)
{
    if (seed == 0) {
        timeval tv;
        gettimeofday(&tv, NULL);
        seed = tv.tv_sec * 1000 * 1000 + tv.tv_usec;
    }

    m_s1 = LCG(seed);
    m_s2 = LCG(m_s1);
    m_s3 = LCG(m_s2);

    for (int i = 0; i < 6; i++) {
        uniformInt();
    }
}

/*!
 * \brief Generate a random integer in the range [0, 2^32-1]
 * \return A random number drawn from a uniform distribution [0, 2^32-1]
 */
uint32_t RNG::uniformInt()
{
    m_s1 = TAUSWORTHE(m_s1, 13, 19, 4294967294UL, 12);
    m_s2 = TAUSWORTHE(m_s2,  2, 25, 4294967288UL,  4);
    m_s3 = TAUSWORTHE(m_s3,  3, 11, 4294967280UL, 17);

    return (m_s1 ^ m_s2 ^ m_s3);
}

/*!
 * \brief Generate a random floating point number in the range (0, 1]
 * \return A random number drawn from a uniform distribution (0, 1]
 */
double RNG::uniformPositive()
{
    double r;

    do {
        r = uniform();
    } while (r == 0.0);

    return r;
}

/*!
 * \brief Generate a vector with two independent random components drawn from a normal distribution
 * \param sigma Standard deviation
 * \param mean Expected value
 * \return A random vector drawn from a normal distribution
 */
Vector2 RNG::normalVector(double sigma, double mean)
{
    double u;
    double v;
    double s;

    do {
        u = -1.0 + 2.0 * uniformPositive();
        v = -1.0 + 2.0 * uniformPositive();

        s = u * u + v * v;
    } while (s == 0.0 || s >= 1.0);

    // Box-Muller transform (polar)
    const double tmp = sigma * std::sqrt(-2.0 * std::log(s) / s);

    Vector2 result;
    result.x = tmp * u + mean;
    result.y = tmp * v + mean;
    return result;
}
