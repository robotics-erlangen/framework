#include "quadraticleastsquaresfitter.h"

QuadraticLeastSquaresFitter::QuadraticLeastSquaresFitter(int pointLimit) :
    m_pointLimit(pointLimit)
{
    Q_ASSERT(m_pointLimit >= 4);
}

QuadraticLeastSquaresFitter::~QuadraticLeastSquaresFitter() { }

void QuadraticLeastSquaresFitter::addPoint(float x, float y)
{
    if (m_points.size() == m_pointLimit) {
        m_points.removeFirst();
    }
    m_points.append(std::make_pair(x, y));
}

void QuadraticLeastSquaresFitter::clear()
{
    m_points.clear();
}

auto QuadraticLeastSquaresFitter::fit() -> QuadraticFitResult
{
    const int n = m_points.size();
    if (n < 4) {
        QuadraticFitResult result = { false, 0, 0, 0 };
        return result;
    }

    float Tx = 0, Ty = 0, Txq = 0, Txy = 0, Txc = 0, Txqy = 0, Txf = 0;

    for (int i = 0; i < n; ++i) {
        const std::pair<float, float> &val = m_points[i];
        Tx += val.first;
        Ty += val.second;
        Txq += val.first * val.first;
        Txy += val.first * val.second;
        Txc += (val.first * val.first) * val.first;
        Txqy += (val.first * val.first) * val.second;
        Txf += (val.first * val.first) * (val.first * val.first);
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
