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

#ifndef KALMANFILTER_H
#define KALMANFILTER_H

#include <Eigen/Dense>

//! @param DIM dimension of state vector
//! @param MDIM dimension of observation vector
template <int DIM, int MDIM>
class KalmanFilter
{
public:
    typedef Eigen::Matrix<double, DIM, DIM> Matrix;
    typedef Eigen::Matrix<double, MDIM, DIM> MatrixM;
    typedef Eigen::Matrix<double, MDIM, MDIM> MatrixMM;
    typedef Eigen::Matrix<double, DIM, 1> Vector;
    typedef Eigen::Matrix<double, MDIM, 1> VectorM;

public:
    EIGEN_MAKE_ALIGNED_OPERATOR_NEW
    explicit KalmanFilter(const Vector &x) :
        F(Matrix::Identity()),
        B(Matrix::Identity()),
        u(Vector::Zero()),
        Q(Matrix::Zero()),
        H(MatrixM::Zero()),
        R(MatrixMM::Zero()),
        z(VectorM::Zero()),
        m_xm(x),
        m_Pm(Matrix::Identity()),
        m_x(x),
        m_P(Matrix::Identity())
    {
    }

public:
    void predict(bool permanentUpdate)
    {
        m_xm = F * m_x + u;
        m_Pm = B * m_P * B.transpose() + Q;
        if (permanentUpdate) {
            m_x = m_xm;
            m_P = m_Pm;
        }
    }

    void update()
    {
        VectorM y = z - H * m_xm;
        MatrixMM S = H * m_Pm * H.transpose() + R;
        Eigen::Matrix<double, DIM, MDIM> K = m_Pm * H.transpose() * S.inverse();
        m_x = m_xm + K * y;
        m_P = (Matrix::Identity() - K * H) * m_Pm;
    }

    const Vector& state() const
    {
        return m_xm;
    }

    const Vector& baseState() const
    {
        return m_x;
    }

    // !!! Use with care
    void modifyState(int index, double value)
    {
        m_xm(index) = value;
    }

public:
    //! state transition model
    Matrix F;
    //! state transition jacobian
    Matrix B;
    //! control input
    Vector u;
    //! covariance of the process noise
    Matrix Q;
    //! observation model
    MatrixM H;
    //! covariance of the observation noise
    MatrixMM R;

    //! observation
    VectorM z;

private:
    //! predicted state
    Vector m_xm;
    //! predicted error covariance matrix
    Matrix m_Pm;
    //! updated state
    Vector m_x;
    //! updated error covariance matrix
    Matrix m_P;
};

#endif // KALMANFILTER_H
