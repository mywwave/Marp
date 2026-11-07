#pragma once

#include "HybridMarpHighlightsSpec.hpp"

namespace margelo::nitro::marphighlights {

class HybridMarpHighlights : public HybridMarpHighlightsSpec {
public:
  HybridMarpHighlights() : HybridObject(TAG) {}

  std::optional<std::shared_ptr<ArrayBuffer>> tokenize(SourceText source,
                                                       double language) override;
};

} // namespace margelo::nitro::marphighlights
