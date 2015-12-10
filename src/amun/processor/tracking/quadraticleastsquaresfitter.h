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
    ~QuadraticLeastSquaresFitter();

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
