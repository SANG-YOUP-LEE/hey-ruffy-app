import UIKit
import WebKit
import UserNotifications
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, WKScriptMessageHandler {

    var window: UIWindow?
    private let bridgeMessageName = "notify"          // JS: window.webkit.messageHandlers.notify.postMessage(...)
    private var didAttachHandler = false
    private let soundName = "ruffysound001.wav"       // 번들에 포함되어 있어야 함(Target Membership 체크)

    // MARK: - App life cycle
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {

        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, err in
            print("notif permission:", granted, err as Any)
        }

        attachBridgeHandlerOnce()
        cleanupAllNotificationsOnce()     // 최초 1회: 과거 유령 예약 싹 정리
        return true
    }

    // MARK: - Bridge attach (once)
    private func attachBridgeHandlerOnce() {
        guard !didAttachHandler else { return }
        didAttachHandler = true

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            guard let self = self else { return }
            guard
                let bridgeVC = self.window?.rootViewController as? CAPBridgeViewController,
                let webView = bridgeVC.bridge?.webView
            else {
                print("Bridge/WebView not ready yet"); return
            }

            let ucc = webView.configuration.userContentController
            ucc.removeScriptMessageHandler(forName: self.bridgeMessageName)
            ucc.add(self, name: self.bridgeMessageName)
            print("WKScriptMessageHandler attached for \(self.bridgeMessageName)")
        }
    }

    // MARK: - WKScriptMessageHandler
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == bridgeMessageName else { return }

        // 단일/배열 모두 허용
        if let dict = message.body as? [String: Any] {
            handleBridge(dict)
        } else if let arr = message.body as? [[String: Any]] {
            for d in arr { handleBridge(d) }
        } else {
            print("BRIDGE invalid payload:", message.body)
        }
    }

    private func handleBridge(_ dict: [String: Any]) {
        let action = (dict["action"] as? String) ?? ""
        print("BRIDGE recv:", action, dict)

        switch action {

        case "cancel":
            if let id = dict["id"] as? String {
                IOSAlarmScheduler.cancel(byPrefix: id)
            }

        case "scheduleOnce":
            let baseId = (dict["id"] as? String) ?? "alarm"
            let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
            let line2 = (dict["title"] as? String) ?? "다짐"
            let line3 = (dict["subtitle"] as? String) ?? ""

            // timestamp(ms) ← NaN/무효 보정: hour/minute 또는 +60초로 대체
            let tsVal = dict["timestamp"] as? Double ?? -1
            var fire: Date
            if tsVal.isFinite && !tsVal.isNaN && tsVal > 0 {
                fire = Date(timeIntervalSince1970: tsVal / 1000.0)
            } else if let h = dict["hour"] as? Int, let m = dict["minute"] as? Int {
                var comp = Calendar.current.dateComponents([.year,.month,.day], from: Date())
                comp.hour = h; comp.minute = m; comp.second = 0
                fire = Calendar.current.date(from: comp) ?? Date().addingTimeInterval(60)
                if fire <= Date() { fire = Calendar.current.date(byAdding: .day, value: 1, to: fire)! }
                print("scheduleOnce: timestamp NaN → fallback hour/minute @ \(fire)")
            } else {
                fire = Date().addingTimeInterval(60)
                print("scheduleOnce: timestamp NaN → fallback +60s @ \(fire)")
            }

            IOSAlarmScheduler.scheduleOnce(
                at: fire, id: baseId,
                line1: appName, line2: line2, line3: line3,
                soundName: soundName
            )

        case "scheduleDaily":
            let baseId = (dict["id"] as? String) ?? "alarm"
            let hour = dict["hour"] as? Int ?? 9
            let minute = dict["minute"] as? Int ?? 0
            let interval = max(1, dict["interval"] as? Int ?? 1)      // 1=매일, 2+=N일마다
            let startDate = dict["startDate"] as? String              // "YYYY-MM-DD"
            let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
            let line2 = (dict["title"] as? String) ?? "다짐"
            let line3 = (dict["subtitle"] as? String) ?? ""

            IOSAlarmScheduler.scheduleDaily(
                hour: hour, minute: minute, intervalDays: interval, startDate: startDate,
                baseId: baseId, line1: appName, line2: line2, line3: line3, soundName: soundName
            )

        case "scheduleWeekly":
            let baseId = (dict["id"] as? String) ?? "alarm"
            let hour = dict["hour"] as? Int ?? 9
            let minute = dict["minute"] as? Int ?? 0
            let weekdays = (dict["weekdays"] as? [Int] ?? [2]).map { min(max($0,1),7) } // 1=일..7=토
            let intervalWeeks = max(1, dict["intervalWeeks"] as? Int ?? 1)
            let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
            let line2 = (dict["title"] as? String) ?? "다짐"
            let line3 = (dict["subtitle"] as? String) ?? ""

            IOSAlarmScheduler.scheduleWeekly(
                hour: hour, minute: minute, intervalWeeks: intervalWeeks, weekdays: weekdays,
                baseId: baseId, line1: appName, line2: line2, line3: line3, soundName: soundName
            )

        case "scheduleMonthly":
            let baseId = (dict["id"] as? String) ?? "alarm"
            let day = (dict["day"] as? Int) ?? IOSAlarmScheduler.dayFrom(dict: dict)
            let hour = dict["hour"] as? Int ?? 9
            let minute = dict["minute"] as? Int ?? 0
            let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
            let line2 = (dict["title"] as? String) ?? "다짐"
            let line3 = (dict["subtitle"] as? String) ?? ""

            IOSAlarmScheduler.scheduleMonthly(
                day: day, hour: hour, minute: minute,
                baseId: baseId, line1: appName, line2: line2, line3: line3, soundName: soundName
            )

        // 디버그 도구(선택): 필요 없으면 안 보내면 됨
        case "debugPing":
            IOSAlarmScheduler.debugPing(after: 20, baseId: "rt_ping")
            IOSAlarmScheduler.dumpPendingWithNextDates(tag: "after-debugPing")

        case "dumpPending":
            IOSAlarmScheduler.dumpPendingWithNextDates(tag: "manual")

        default:
            print("Unknown action:", action)
        }
    }

    // MARK: - UNUserNotificationCenterDelegate
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let r = response.notification.request
        print("DELIVERED:", r.identifier, "| title:", r.content.title, "| subtitle:", r.content.subtitle)
        completionHandler()
    }

    // MARK: - One-time cleanup
    private func cleanupAllNotificationsOnce() {
        let key = "didCleanupAllNotifs_v2"
        let ud = UserDefaults.standard
        guard !ud.bool(forKey: key) else { return }
        ud.set(true, forKey: key)

        let c = UNUserNotificationCenter.current()
        c.removeAllDeliveredNotifications()
        c.getPendingNotificationRequests { reqs in
            c.removePendingNotificationRequests(withIdentifiers: reqs.map { $0.identifier })
            print("Super cleanup: removed pending =", reqs.count)
        }
    }
}

