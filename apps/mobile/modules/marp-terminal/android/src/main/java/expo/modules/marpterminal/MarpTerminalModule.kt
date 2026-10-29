package expo.modules.marpterminal

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MarpTerminalModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MarpTerminalSurface")

    // Bumped when native hardware-keyboard handling changes; surfaced in the JS debug
    // logs so a stale native binary is distinguishable from a broken key pipeline.
    Constants(
      "hardwareKeyRevision" to 2,
      "outputRevision" to 1,
    )

    View(MarpTerminalView::class) {
      AsyncFunction("writeOutput") { view: MarpTerminalView, data: String, reset: Boolean ->
        view.writeOutput(data, reset)
      }

      Prop("terminalKey") { view: MarpTerminalView, terminalKey: String ->
        view.terminalKey = terminalKey
      }

      Prop("initialBuffer") { view: MarpTerminalView, initialBuffer: String ->
        view.initialBuffer = initialBuffer
      }

      Prop("fontSize") { view: MarpTerminalView, fontSize: Double ->
        view.fontSize = fontSize.toFloat()
      }

      Prop("focusRequest") { view: MarpTerminalView, focusRequest: Double ->
        view.focusRequest = focusRequest
      }

      Prop("readOnly") { view: MarpTerminalView, readOnly: Boolean ->
        view.readOnly = readOnly
      }

      Prop("autoFocus") { view: MarpTerminalView, autoFocus: Boolean ->
        view.autoFocus = autoFocus
      }

      Prop("appearanceScheme") { view: MarpTerminalView, appearanceScheme: String ->
        view.appearanceScheme = appearanceScheme
      }

      Prop("themeConfig") { view: MarpTerminalView, themeConfig: String ->
        view.themeConfig = themeConfig
      }

      Prop("backgroundColor") { view: MarpTerminalView, backgroundColor: String ->
        view.backgroundColorHex = backgroundColor
      }

      Prop("foregroundColor") { view: MarpTerminalView, foregroundColor: String ->
        view.foregroundColorHex = foregroundColor
      }

      Prop("mutedForegroundColor") { view: MarpTerminalView, mutedForegroundColor: String ->
        view.mutedForegroundColorHex = mutedForegroundColor
      }

      Prop("captureRequest") { view: MarpTerminalView, request: Double ->
        view.captureRequest = request
      }

      Prop("sharedGrid") { view: MarpTerminalView, sharedGrid: List<Int> ->
        view.sharedGrid = sharedGrid
      }
      Events("onInput", "onResize", "onCapture")

      OnViewDidUpdateProps { view: MarpTerminalView ->
        view.applyPendingBuffer()
      }

      OnViewDestroys { view: MarpTerminalView ->
        view.cleanup()
      }
    }
  }
}
