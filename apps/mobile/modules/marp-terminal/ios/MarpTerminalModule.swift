import ExpoModulesCore

public class MarpTerminalModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MarpTerminalSurface")

    // Bumped when native hardware-keyboard handling changes; surfaced in the JS debug
    // logs so a stale native binary is distinguishable from a broken key pipeline.
    Constants([
      "hardwareKeyRevision": 3,
      "outputRevision": 1,
    ])

    View(MarpTerminalView.self) {
      AsyncFunction("writeOutput") { (view: MarpTerminalView, data: String, reset: Bool) in
        view.writeOutput(data, reset: reset)
      }

      Prop("terminalKey") { (view: MarpTerminalView, terminalKey: String) in
        view.terminalKey = terminalKey
      }

      Prop("initialBuffer") { (view: MarpTerminalView, initialBuffer: String) in
        view.initialBuffer = initialBuffer
      }

      Prop("fontSize") { (view: MarpTerminalView, fontSize: Double) in
        view.fontSize = CGFloat(fontSize)
      }

      Prop("focusRequest") { (view: MarpTerminalView, focusRequest: Double) in
        view.focusRequest = focusRequest
      }

      Prop("readOnly") { (view: MarpTerminalView, readOnly: Bool) in
        view.readOnly = readOnly
      }

      Prop("autoFocus") { (view: MarpTerminalView, autoFocus: Bool) in
        view.autoFocus = autoFocus
      }

      Prop("appearanceScheme") { (view: MarpTerminalView, appearanceScheme: String) in
        view.appearanceScheme = appearanceScheme
      }

      Prop("themeConfig") { (view: MarpTerminalView, themeConfig: String) in
        view.themeConfig = themeConfig
      }

      Prop("backgroundColor") { (view: MarpTerminalView, backgroundColor: String) in
        view.backgroundColorHex = backgroundColor
      }

      Prop("foregroundColor") { (view: MarpTerminalView, foregroundColor: String) in
        view.foregroundColorHex = foregroundColor
      }

      Prop("mutedForegroundColor") { (view: MarpTerminalView, mutedForegroundColor: String) in
        view.mutedForegroundColorHex = mutedForegroundColor
      }

      Prop("captureRequest") { (view: MarpTerminalView, request: Double) in
        view.captureRequest = request
      }

      Prop("sharedGrid") { (view: MarpTerminalView, sharedGrid: [Int]) in
        view.sharedGrid = sharedGrid
      }
      Events("onInput", "onResize", "onCapture")

      OnViewDidUpdateProps { (view: MarpTerminalView) in
        view.applyPendingBuffer()
      }
    }
  }
}
