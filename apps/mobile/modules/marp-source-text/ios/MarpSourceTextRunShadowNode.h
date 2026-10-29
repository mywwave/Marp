#pragma once

#include <react/renderer/components/MarpSourceTextSpec/EventEmitters.h>
#include <react/renderer/components/MarpSourceTextSpec/Props.h>
#include <react/renderer/components/MarpSourceTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {
extern const char MarpSourceTextRunComponentName[];

using MarpSourceTextRunShadowNode =
    ConcreteViewShadowNode<MarpSourceTextRunComponentName, MarpSourceTextRunProps,
                           MarpSourceTextRunEventEmitter, MarpSourceTextRunState>;
} // namespace facebook::react
