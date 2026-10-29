#pragma once

#include "MarpSourceTextRunShadowNode.h"

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {
using MarpSourceTextRunComponentDescriptor =
    ConcreteComponentDescriptor<MarpSourceTextRunShadowNode>;

void MarpSourceTextRunSpec_registerComponentDescriptorsFromCodegen(
    std::shared_ptr<const ComponentDescriptorProviderRegistry> registry);
} // namespace facebook::react
