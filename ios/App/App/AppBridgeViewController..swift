import Capacitor

// ✅ 플러그인 "인스턴스" 등록 지점
class AppBridgeViewController: CAPBridgeViewController {
  override open func capacitorDidLoad() {
    super.capacitorDidLoad()
    bridge?.registerPluginInstance(RuffyTimePickerPlugin())
  }
}

