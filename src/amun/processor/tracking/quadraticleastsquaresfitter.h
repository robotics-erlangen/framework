/***************************************************************************
 *   Copyright 2020 Alexander Danzer, Andreas Wendler                      *
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

#ifndef QUADRATICLEASTSQUARESFITTER_H
#define QUADRATICLEASTSQUARESFITTER_H

#include <QVector>
#include <utility>

class QuadraticLeastSquaresFitter
{
public:
    struct QuadraticFitResult {
        bool is_valid;
        float a;
        float b;
        float c;
    };

    explicit QuadraticLeastSquaresFitter(int pointLimit);

    void addPoint(float x, float y);
    void clear();
    int pointCount() const { return m_points.size(); }
    int pointLimit() const { return m_pointLimit; }
    QuadraticFitResult fit();
    float calculateError(const QuadraticFitResult &res);
private:
    void update(float scale, std::pair<float, float> &val);

    QVector<std::pair<float, float>> m_points;
    int m_pointLimit;
    float Tx, Ty, Txq, Txy, Txc, Txqy, Txf;
};

#endif // QUADRATICLEASTSQUARESFITTER_H
