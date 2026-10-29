package expo.modules.marpwidgetexpiry

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MarpWidgetExpiryModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MarpWidgetExpiry")
    Function("schedule") { name: String, deadlines: List<Double> ->
      val context = appContext.reactContext ?: return@Function
      WidgetExpiryReceiver.schedule(context, name, deadlines.map { it.toLong() }.toLongArray())
    }
  }
}
