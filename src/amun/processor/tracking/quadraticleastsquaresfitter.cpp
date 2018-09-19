#include "quadraticleastsquaresfitter.h"

QuadraticLeastSquaresFitter::QuadraticLeastSquaresFitter(int pointLimit) :
    m_pointLimit(pointLimit)
{
    Q_ASSERT(m_pointLimit >= 4);
    clear();
}

void QuadraticLeastSquaresFitter::update(float scale, std::pair<float, float> &val)
{
    Tx += scale * val.first;
    Ty += scale * val.second;
    Txq += scale * val.first * val.first;
    Txy += scale * val.first * val.second;
    Txc += scale * (val.first * val.first) * val.first;
    Txqy += scale * (val.first * val.first) * val.second;
    Txf += scale * (val.first * val.first) * (val.first * val.first);
}

void QuadraticLeastSquaresFitter::addPoint(float x, float y)
{
    if (m_points.size() == m_pointLimit) {
        update(-1, m_points[0]);
        m_points.removeFirst();
    }
    m_points.append(std::make_pair(x, y));
    update(1, m_points[m_points.size() - 1]);
}

void QuadraticLeastSquaresFitter::clear()
{
    m_points.clear();
    Tx = 0, Ty = 0, Txq = 0, Txy = 0, Txc = 0, Txqy = 0, Txf = 0;
}

auto QuadraticLeastSquaresFitter::fit() -> QuadraticFitResult
{
    const int n = m_points.size();
    if (n < 4) {
        QuadraticFitResult result = { false, 0, 0, 0 };
        return result;
    }

    // formula source: http://www.azdhs.gov/lab/documents/license/resources/calibration-training/12-quadratic-least-squares-regression-calib.pdf
    //S = the sum of  all the individual values
    //S(xx) = (Sx_i^2) - [(Sx_i)^2/n]
    //S(xy) = (Sx_i y_i) - [(Sx_i)*(Sy_i)/n]
    //S(xx^2) = (Sx_i^3) - [(Sx_i)*(Sx_i^2)/n]
    //S(x^2 y) = (Sx_i^2 y_i) - [(Sx_i^2)*(Sy_i)/n]
    //S(x^2 x^2) = (Sx_i^4)  - [(Sx_i^2)^2/n]
    float Sxx = Txq - Tx*Tx/n;
    float Sxy = Txy - Tx*Ty/n;
    float Sxxq = Txc - Tx*Txq/n;
    float Sxqy = Txqy - Txq*Ty/n;
    float Sxqxq = Txf - Txq*Txq/n;

    //a = {[S(x^2 y) * S(xx)] - [S(xy) * S(xx^2)]} / { [(S(xx) * S(x^2 x^2)] - [S(xx^2)]^2 }
    //b = {[S(xy) * S(x^2 x^2)]  - [S(x^2 y) * S(xx^2)]} / {[S(xx) * S(x^2 x^2)] - [S(xx^2)]^2}
    //c = [(Sy_i)/n] - {b * [(Sx_i)/n]} - {a * [S(x_i^2)/n]}
    float a = (Sxqy * Sxx - Sxy * Sxxq) / (Sxx * Sxqxq - Sxxq * Sxxq);
    float b = (Sxy * Sxqxq - Sxqy * Sxxq) / (Sxx * Sxqxq - Sxxq * Sxxq);
    float c = Ty / n - b * Tx / n - a * Txq / n;

    // f = a*x^2 + b*x + c
    QuadraticFitResult result = { true, a, b, c };
    return result;
}

float QuadraticLeastSquaresFitter::calculateError(const QuadraticFitResult &res)
{
    if (!res.is_valid) {
        return std::numeric_limits<float>::infinity();
    }
    // error = S(a*x_i^2 + b*x_i + c - y_i)
    float error = 0;
    for (int i = 0; i < m_points.size(); ++i) {
        const std::pair<float, float> &val = m_points[i];
        float delta = (res.a * val.first*val.first + res.b * val.first + res.c - val.second);
        error += delta * delta;
    }
    return error;
}
