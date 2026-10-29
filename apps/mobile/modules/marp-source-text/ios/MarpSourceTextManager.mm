#import <React/RCTUIManager.h>
#import <React/RCTViewManager.h>

@interface MarpSourceTextManager : RCTViewManager
@end

@implementation MarpSourceTextManager

RCT_EXPORT_MODULE(MarpSourceText)

- (UIView *)view {
  return [[UIView alloc] init];
}

@end

@interface MarpSourceTextRunManager : RCTViewManager
@end

@implementation MarpSourceTextRunManager

RCT_EXPORT_MODULE(MarpSourceTextRun)

- (UIView *)view {
  return nil;
}

@end
