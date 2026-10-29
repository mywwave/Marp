#import "MarpSourceTextRun.h"
#import <React/RCTFabricComponentsPlugins.h>
#import "MarpSourceTextRunComponentDescriptor.h"
#import <react/renderer/components/MarpSourceTextSpec/Props.h>
#import <react/renderer/components/MarpSourceTextSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface MarpSourceTextRun () <RCTMarpSourceTextRunViewProtocol>

@end

@implementation MarpSourceTextRun {
  NSString *_text;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<
      MarpSourceTextRunComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps =
        std::make_shared<const MarpSourceTextRunProps>();
    _props = defaultProps;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &oldViewProps =
      *std::static_pointer_cast<MarpSourceTextRunProps const>(_props);
  const auto &newViewProps =
      *std::static_pointer_cast<MarpSourceTextRunProps const>(props);

  if (newViewProps.text != oldViewProps.text) {
    NSString *text = [NSString stringWithUTF8String:newViewProps.text.c_str()];
    _text = text;
  }

  [super updateProps:props oldProps:oldProps];
}

+ (BOOL)shouldBeRecycled {
  return NO;
}

Class<RCTComponentViewProtocol> MarpSourceTextRunCls(void) {
  return MarpSourceTextRun.class;
}

@end
