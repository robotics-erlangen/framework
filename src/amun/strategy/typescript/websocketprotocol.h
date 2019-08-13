#ifndef WEBSOCKETPROTOCOL_H
#define WEBSOCKETPROTOCOL_H

#include <vector>

enum ws_decode_result {
  FRAME_OK, FRAME_INCOMPLETE, FRAME_CLOSE, FRAME_ERROR
};

std::vector<char> encode_frame_hybi17(const std::vector<char>& message);
ws_decode_result decode_frame_hybi17(const std::vector<char>& buffer,
                                            bool client_frame,
                                            int* bytes_consumed,
                                            std::vector<char>* output,
                                            bool* compressed);

#endif // WEBSOCKETPROTOCOL_H
