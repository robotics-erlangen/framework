#include "simulator.hpp"
#include "core/timer.h"

namespace underbots {
    // TODO: the new Timer() is a memory leak
    Simulator::Simulator() : camun::simulator::Simulator(new Timer(), amun::SimulatorSetup(), true) {

    }


}
