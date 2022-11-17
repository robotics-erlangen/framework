/***************************************************************************
 *   Copyright 2020 Tobias Heineken                                        *
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

#include "gtest/gtest.h"
#include "gtest/gtest-param-test.h"
#include "core/rng.h"

#include <math.h>

struct RNGData {
    explicit RNGData(int s): seed(s), r(seed) {}
    int seed;
    RNG r;
};

class RNGTest :  public testing::Test, public RNGData{
public:
    RNGTest(): RNGData(155) {}

};



TEST_F(RNGTest, uniformBounds) {
//    RNG r(GetParam());
    double last = -1.;
    double EPS = 1e-10;
    int eq = 0;
    const int runs = 50;

    for(int i=0; i < runs; ++i){
        double uni = r.uniform();
        ASSERT_LE(uni, 1.);
        ASSERT_GE(uni, 0.);
        if (std::abs(uni - last) < EPS) {
            eq++;
        }
        last = uni;
    }

    int exp_eq = std::ceil(2*runs * EPS);
    ASSERT_LE(eq, exp_eq * 2); //Note: This is a bad way of checking (X_i - X_(i+1)) conforming to X_uni - X_uni. The KSTests do that way more convincingly
    ASSERT_GE(eq, exp_eq / 2);
}

TEST_F(RNGTest, uniformPositiveBounds) {
    const double EPS = 1e-10;
    const int runs = 50;
    int eq = 0;
    double last = -1.;

    for(int i=0; i < runs; ++i){
        double uni = r.uniformPositive();
        ASSERT_LE(uni, 1.);
        ASSERT_GT(uni, 0.);
        if (std::abs(uni - last) < EPS) {
            eq++;
        }
        last = uni;
    }

    int exp_eq = std::ceil(2*runs * EPS);
    ASSERT_LE(eq, exp_eq * 2); //Note: This is a bad way of checking (X_i - X_(i+1)) conforming to X_uni - X_uni. The KSTests do that way more convincingly
    ASSERT_GE(eq, exp_eq / 2);
}

TEST_F(RNGTest, uniformFloatBounds) {
    const double EPS = 1e-10;
    const int runs = 50;
    int eq = 0;
    double last = -1.;
    const float min = 4755.5;
    const float max = 5903.1514;

    for(int i=0; i < runs; ++i){
        double uni = r.uniformFloat(min, max);
        ASSERT_LE(uni, max);
        ASSERT_GE(uni, min);
        if (std::abs(uni - last) < EPS) {
            eq++;
        }
        last = uni;
    }

    int exp_eq = std::ceil(2*runs * EPS / (max-min));
    ASSERT_LE(eq, exp_eq * 2);
    ASSERT_GE(eq, exp_eq / 2);
}

TEST_F(RNGTest, seeding) {
    // the number of doubles added to values per run
    constexpr int NUMS_PER_RUN = 12;

    ASSERT_NE(seed, 0);
    const int runs = 50;
    std::vector<double> values;
    values.reserve(runs * NUMS_PER_RUN);

    for (int i=0; i < runs; ++i) {
        values.push_back(r.uniform());
        values.push_back(r.uniformInt());
        values.push_back(r.uniformPositive());
        values.push_back(r.uniformFloat(4, 8));
        auto vu = r.uniformVector();
        values.push_back(vu.x);
        values.push_back(vu.y);
        auto vui = r.uniformVectorIn(Vector(2, 5), Vector(-10, 12));
        values.push_back(vu.x);
        values.push_back(vu.y);
        values.push_back(r.normal(1));
        auto vn = r.normalVector(1);
        values.push_back(vn.x);
        values.push_back(vn.y);
        values.push_back(r.normal(5, 25));
    }


    r.seed(seed);

    for(int i=0; i < runs; ++i) {
        ASSERT_EQ(r.uniform(), values[i * NUMS_PER_RUN]);
        ASSERT_EQ(r.uniformInt(), values[i * NUMS_PER_RUN + 1]);
        ASSERT_EQ(r.uniformPositive(), values[i * NUMS_PER_RUN + 2]);
        ASSERT_EQ(r.uniformFloat(4, 8), values[i * NUMS_PER_RUN + 3]);
        auto vu = r.uniformVector();
        ASSERT_EQ(vu.x, values[i * NUMS_PER_RUN + 4]);
        ASSERT_EQ(vu.y, values[i * NUMS_PER_RUN + 5]);
        auto vui = r.uniformVectorIn(Vector(2, 5), Vector(-10, 12));
        ASSERT_EQ(vu.x, values[i * NUMS_PER_RUN + 6]);
        ASSERT_EQ(vu.y, values[i * NUMS_PER_RUN + 7]);
        ASSERT_EQ(r.normal(1), values[i * NUMS_PER_RUN + 8]);
        auto vn = r.normalVector(1);
        ASSERT_EQ(vn.x, values[i * NUMS_PER_RUN + 9]);
        ASSERT_EQ(vn.y, values[i * NUMS_PER_RUN + 10]);
        ASSERT_EQ(r.normal(5, 25), values[i * NUMS_PER_RUN + 11]);
    }
}


TEST_F(RNGTest, normalMean) {
    // std::abs(mu - MEAN) < 4sigma / sqrt(n)
    // if r follows a normal distribution, the likelyhood of failing the prev. test is less than 1e-4
    const int runs = 100'000; // has to be much smaller than 2**54 (mantissa for double)
    double sum = 0;
    const double mean = 5;
    for (int i=0; i < runs; ++i){
        sum += r.normal(mean);
    }
    ASSERT_LT(std::abs(sum/runs), 4*mean / std::sqrt(runs));
}


template<typename GEN, typename EVAL>
static void KSTest(int runs, GEN generate, EVAL eval) {
    // This test uses the KS-Test (https://en.wikipedia.org/wiki/Kolmogorov%E2%80%93Smirnov_test)
    std::vector<double> values;
    values.reserve(runs);
    const double certainty = 1e-4;
    ASSERT_GT(runs, 35);
    for(int i=0; i < runs; ++i) {
        values.push_back(generate());
    }
    std::sort(values.begin(), values.end());

    double prev = 0.0;
    double d_alpha = std::sqrt(-0.5 * std::log(certainty / 2)) / std::sqrt(runs);
    for(int i=0; i < runs; ++i) {
        std::string name = "bucket";
        name += std::to_string(i);
        name += ", value: ";
        name += std::to_string(values[i]);
        SCOPED_TRACE(name);
        double f0xi = eval(values[i]);
        double sxi = 1.0 * i / runs;
        double doi = std::abs(sxi - f0xi);
        double dui = std::abs(prev - f0xi);
        ASSERT_LT(doi, d_alpha);
        ASSERT_LT(dui, d_alpha);
        prev = sxi;
    }
}

static double F_uniform(double in) {
    if (in < 0) return 0;
    if (in > 1) return 1;
    return in;
}

static double F2_uniform(double in) {
    if (in < 0) return 0;
    if (in > 2) return 1;
    if (in < 1) return 0.5 * in * in;
    return 1 - F2_uniform(2-in);
}

static double PHI(double x) {
    return 0.5 * ( 1 + erf(x / std::sqrt(2)));
}


static std::function<double(double)> F_gaussian(double mu, double sigma) {
    return [=](double in) {return PHI((in-mu)/sigma);};
}


TEST_F(RNGTest, uniformDistribution) {
    const int runs = 10'000; // has to be larger than 35
    KSTest(runs, [this](){return this->r.uniform();}, F_uniform);
}

TEST_F(RNGTest, normalDistribution) {
    const int runs = 10'000; // has to be larger than 35
    for(int i=1; i < 5; ++i) {
        for (double j = -1; j < 1; j += 0.05) {
            KSTest(runs, [this, i, j](){return this->r.normal(i, j);}, F_gaussian(j, i));
        }
    }
}

static double addNormal(const std::vector<double>& sigmas, RNG& rng) {
    double sum = 0.;
    for(double sig : sigmas) {
        sum += rng.normal(sig);
    }
    return sum;
}

static double expSigma(const std::vector<double>& sigmas) {
    double sq_sum = 0.;
    for (double sig : sigmas) {
        sq_sum += sig * sig;
    }
    return std::sqrt(sq_sum);
}

TEST_F(RNGTest, independendNormal) {
    const int runs = 1'000; // has to be larger than 35
    const int sz = 10;
    std::vector<double> sigmas;
    sigmas.reserve(sz);
    for (int i=0; i < sz; ++i) {
        SCOPED_TRACE("init");
        sigmas.push_back(i*.25 + .2);
        KSTest(runs, [this, &sigmas](){return addNormal(sigmas, this->r);}, F_gaussian(0, expSigma(sigmas)));
    }
    for (int i=0; i < 500; ++i){
        std::string name = "load";
        name += std::to_string(i);
        SCOPED_TRACE(name);
        sigmas[i%sz] = (i%11) * 1.33 + 20.12;
        KSTest(runs, [this, &sigmas](){return addNormal(sigmas, this->r);}, F_gaussian(0, expSigma(sigmas)));
    }
}

TEST_F(RNGTest, independendVector) {
    const int runs = 10'000;
    KSTest(runs, [this](){auto v = this->r.normalVector(2, .5); return v.x + v.y;}, F_gaussian(1, std::sqrt(2*2+2*2)));
}

TEST_F(RNGTest, floatDistribution) {
    const int runs = 10'000; // has to be larger than 35
    KSTest(runs, [this](){return (this->r.uniformFloat(3, 5) -3) / 2;}, F_uniform);
}

TEST_F(RNGTest, independedUniform) {
    const int runs = 10'000; // has to be larger than 35
    KSTest(runs, [this](){return this->r.uniform()+ this->r.uniform();}, F2_uniform);
}

TEST_F(RNGTest, independedUniformVec) {
    const int runs = 10'000; // has to be larger than 35
    KSTest(runs, [this](){auto v = this->r.uniformVector(); return v.x+ v.y;}, F2_uniform);
}

TEST_F(RNGTest, independedUniformVecIn) {
    const int runs = 10'000; // has to be larger than 35
    KSTest(runs, [this](){auto v = (this->r.uniformVectorIn(Vector(3, -2), Vector(5, 0)) - Vector(3, -2)) / 2; return v.x+ v.y;}, F2_uniform);
}

TEST_F(RNGTest, multipleIndependendUniform) {
    // As folding gets harder and harder to do by hand
    // this test instead tests for pairs if they are correlated.
    // If none are, all elements are considered independend

    const int runs = 1'000;
    std::vector<double> arr[10];
    for(int j=0; j < 10; ++j){
        arr[j].reserve(runs);
    }

    for (int i=0; i< runs; ++i){
        for(int j=0; j < 10; ++j){
            arr[j].push_back(r.uniform());
        }
    }

    for(int i=0; i < 10; ++i){
        for(int j=i+1; j < 10; ++j){
            int cnt = 0;
            KSTest(runs, [&arr, i, j, &cnt](){auto first = arr[i][cnt]; auto snd = arr[j][cnt]; cnt++; return first + snd;}, F2_uniform);
        }
    }
}

TEST_F(RNGTest, differentSeeds) {
    RNGData other(17);
    const int runs = 10'000;
    KSTest(runs, [&other, this](){auto first = this->r.uniform(); auto snd = other.r.uniform(); return first + snd;}, F2_uniform);
    KSTest(runs, [&other, this](){auto first = this->r.normalVector(2, .25); auto snd = other.r.normalVector(5, .25); return first.x + first.y + snd.x + snd.y;},
            F_gaussian(1.0, std::sqrt(2*2 + 2*2 + 5*5 + 5*5)));
}

TEST_F(RNGTest, seed0) {
    // contrary to all other seeds, RNG(0)
    // uses currentTimeOfDay (and therefore does not work for unittests)
    //
    // BUT: r.seed(0) does not have this functionality and has to work deterministicly.


    const int runs = 10'000;
    std::vector<double> arr[2];
    arr[0].reserve(runs);
    arr[1].reserve(runs);

    for(int i=0; i < 2; ++i) {
        r.seed(0);
        for(int j=0; j < runs; ++j){
            arr[i].push_back(r.uniform());
        }
    }

    for(int j=0; j < runs; ++j){
        EXPECT_EQ(arr[0][j], arr[1][j]);
    }

    std::vector<double>* ptr = arr;

    int cnt = 0;
    KSTest(runs, [ptr, &cnt](){return ptr[0][cnt++];}, F_uniform);
}
