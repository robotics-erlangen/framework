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

    QuadraticLeastSquaresFitter(int pointLimit);
    ~QuadraticLeastSquaresFitter();

    void addPoint(float x, float y);
    void clear();
    int pointCount() const { return m_points.size(); }
    QuadraticFitResult fit();
private:
    QVector<std::pair<float, float>> m_points;
    const int m_pointLimit;
};

#endif // QUADRATICLEASTSQUARESFITTER_H
