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

    // MARK: - Helpers to read hour/minute & weekdays safely
    private func readHourMinute(_ dict: [String: Any]) -> (hour: Int, minute: Int) {
        // top-level 우선, 없으면 time{}, alarm{} 안에서 탐색
        if let h = dict["hour"] as? Int, let m = dict["minute"] as? Int {
            return (h, m)
        }
        if let t = dict["time"] as? [String: Any],
           let h = t["hour"] as? Int, let m = t["minute"] as? Int {
            return (h, m)
        }
        if let a = dict["alarm"] as? [String: Any],
           let h = a["hour"] as? Int, let m = a["minute"] as? Int {
            return (h, m)
        }
        return (9, 0)
    }

    private func readWeekdays(_ dict: [String: Any]) -> [Int] {
        if let w = dict["weekdays"] {
            return normalizeWeekdays(w)
        }
        if let a = dict["alarm"] as? [String: Any], let w = a["weekdays"] {
            return normalizeWeekdays(w)
        }
        if let w = dict["weekday"] {
            return normalizeWeekdays(w)
        }
        return [1,2,3,4,5,6,7]
    }

    private func readIntervalWeeks(_ dict: [String: Any]) -> Int {
        // intervalWeeks / weeksInterval / everyWeeks 모두 지원
        let v = (dict["intervalWeeks"] as? Int)
            ?? (dict["weeksInterval"] as? Int)
            ?? (dict["everyWeeks"] as? Int)
            ?? 1
        return max(1, v)
    }

    private func readIntervalDays(_ dict: [String: Any]) -> Int {
        // interval / intervalDays 모두 지원
        let v = (dict["interval"] as? Int)
            ?? (dict["intervalDays"] as? Int)
            ?? 1
        return max(1, v)
    }

    private func handleBridge(_ dict: [String: Any]) {
        let action = (dict["action"] as? String) ?? ""
        print("BRIDGE recv:", action, dict)

        switch action {

        // === 새 경로: JS가 'schedule' 하나로 보내는 경우 ===
        case "schedule": // repeatMode 로 분기
            let repeatMode = (dict["repeatMode"] as? String) ?? "once"
            let baseId = (dict["id"] as? String) ?? "alarm"
            let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
            let line2 = (dict["title"] as? String) ?? (dict["name"] as? String) ?? "다짐"
            let line3 = (dict["subtitle"] as? String) ?? ""

            switch repeatMode {
            case "once":
                // timestamp(ms) 우선, 없으면 hour/minute or +60초
                let tsVal = dict["timestamp"] as? Double ?? -1
                var fire: Date
                if tsVal.isFinite && !tsVal.isNaN && tsVal > 0 {
                    fire = Date(timeIntervalSince1970: tsVal / 1000.0)
                } else {
                    let hm = readHourMinute(dict)
                    var comp = Calendar.current.dateComponents([.year,.month,.day], from: Date())
                    comp.hour = hm.hour; comp.minute = hm.minute; comp.second = 0
                    fire = Calendar.current.date(from: comp) ?? Date().addingTimeInterval(60)
                    if fire <= Date() { fire = Calendar.current.date(byAdding: .day, value: 1, to: fire)! }
                    print("schedule(once): fallback @ \(fire)")
                }
                IOSAlarmScheduler.scheduleOnce(
                    at: fire, id: baseId,
                    line1: appName, line2: line2, line3: line3,
                    soundName: soundName
                )

            case "daily":
                let hm = readHourMinute(dict)
                let interval = readIntervalDays(dict)                 // 1=매일, 2+=N일마다
                let startDate = dict["startDate"] as? String          // "YYYY-MM-DD"
                IOSAlarmScheduler.scheduleDaily(
                    hour: hm.hour, minute: hm.minute, intervalDays: interval, startDate: startDate,
                    baseId: baseId, line1: appName, line2: line2, line3: line3, soundName: soundName
                )

            case "weekly":
                let hm = readHourMinute(dict)
                let intervalWeeks = readIntervalWeeks(dict)
                let weekdays = readWeekdays(dict)                     // 1~7(Sun~Sat)
                IOSAlarmScheduler.scheduleWeekly(
                    hour: hm.hour, minute: hm.minute,
                    intervalWeeks: intervalWeeks, weekdays: weekdays,
                    baseId: baseId, line1: appName, line2: line2, line3: line3, soundName: soundName
                )

            case "monthly", "monthly-date":
                let hm = readHourMinute(dict)
                let day = (dict["day"] as? Int) ?? IOSAlarmScheduler.dayFrom(dict: dict)
                IOSAlarmScheduler.scheduleMonthly(
                    day: day, hour: hm.hour, minute: hm.minute,
                    baseId: baseId, line1: appName, line2: line2, line3: line3, soundName: soundName
                )

            case "monthly-nth":
                // 만약 스케줄러가 '월 n번째 요일' 지원한다면 여기에 연결
                // (없다면 dayFrom(dict:)가 적절히 계산해 day를 줄 수도 있음)
                let hm = readHourMinute(dict)
                let day = (dict["day"] as? Int) ?? IOSAlarmScheduler.dayFrom(dict: dict)
                IOSAlarmScheduler.scheduleMonthly(
                    day: day, hour: hm.hour, minute: hm.minute,
                    baseId: baseId, line1: appName, line2: line2, line3: line3, soundName: soundName
                )

            default:
                print("Unknown repeatMode in schedule:", repeatMode)
            }

        // === 기존 경로들(하위 호환) ===
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
            } else {
                let hm = readHourMinute(dict)
                var comp = Calendar.current.dateComponents([.year,.month,.day], from: Date())
                comp.hour = hm.hour; comp.minute = hm.minute; comp.second = 0
                fire = Calendar.current.date(from: comp) ?? Date().addingTimeInterval(60)
                if fire <= Date() { fire = Calendar.current.date(byAdding: .day, value: 1, to: fire)! }
                print("scheduleOnce: timestamp NaN → fallback @ \(fire)")
            }

            IOSAlarmScheduler.scheduleOnce(
                at: fire, id: baseId,
                line1: appName, line2: line2, line3: line3,
                soundName: soundName
            )

        case "scheduleDaily":
            let baseId = (dict["id"] as? String) ?? "alarm"
            let hm = readHourMinute(dict)
            let interval = readIntervalDays(dict)                 // 1=매일, 2+=N일마다
            let startDate = dict["startDate"] as? String          // "YYYY-MM-DD"
            let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
            let line2 = (dict["title"] as? String) ?? "다짐"
            let line3 = (dict["subtitle"] as? String) ?? ""

            IOSAlarmScheduler.scheduleDaily(
                hour: hm.hour, minute: hm.minute, intervalDays: interval, startDate: startDate,
                baseId: baseId, line1: appName, line2: line2, line3: line3, soundName: soundName
            )

        case "scheduleWeekly":
            let baseId = (dict["id"] as? String) ?? "alarm"
            let hm = readHourMinute(dict)
            let intervalWeeks = readIntervalWeeks(dict)
            let weekdays: [Int] = readWeekdays(dict)
            let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
            let line2 = (dict["title"] as? String) ?? "다짐"
            let line3 = (dict["subtitle"] as? String) ?? ""

            IOSAlarmScheduler.scheduleWeekly(
                hour: hm.hour, minute: hm.minute, intervalWeeks: intervalWeeks, weekdays: weekdays,
                baseId: baseId, line1: appName, line2: line2, line3: line3, soundName: soundName
            )

        case "scheduleMonthly":
            let baseId = (dict["id"] as? String) ?? "alarm"
            let hm = readHourMinute(dict)
            let day = (dict["day"] as? Int) ?? IOSAlarmScheduler.dayFrom(dict: dict)
            let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
            let line2 = (dict["title"] as? String) ?? "다짐"
            let line3 = (dict["subtitle"] as? String) ?? ""

            IOSAlarmScheduler.scheduleMonthly(
                day: day, hour: hm.hour, minute: hm.minute,
                baseId: baseId, line1: appName, line2: line2, line3: line3, soundName: soundName
            )

        // 디버그 도구(선택)
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

    // MARK: - Weekday normalizer
    private func normalizeWeekdays(_ raw: Any?) -> [Int] {
        // iOS: 1=Sun,2=Mon,3=Tue,4=Wed,5=Thu,6=Fri,7=Sat
        let mapICS: [String:Int] = ["SU":1,"MO":2,"TU":3,"WE":4,"TH":5,"FR":6,"SA":7]
        let mapKR:  [String:Int] = ["일":1,"월":2,"화":3,"수":4,"목":5,"금":6,"토":7]

        // 1) [Int]
        if let ints = raw as? [Int] {
            if ints.allSatisfy({ (0...6).contains($0) }) {
                // 0~6 기반이면 +1 쉬프트
                let shifted = ints.map { $0 + 1 }
                return Array(Set(shifted)).sorted()
            } else {
                // 이미 1~7 기반이면 클램프만
                let clamped = ints.compactMap { (1...7).contains($0) ? $0 : nil }
                return Array(Set(clamped)).sorted()
            }
        }

        // 2) [String]
        if let strs = raw as? [String] {
            let mapped = strs.compactMap { s -> Int? in
                let u = s.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                if let v = mapICS[u] { return v }
                let k = String(s.prefix(1)) // "월","화" 등
                if let v = mapKR[k] { return v }
                return Int(u)
            }
            if !mapped.isEmpty {
                return Array(Set(mapped.compactMap { (1...7).contains($0) ? $0 : nil })).sorted()
            }
        }

        // 3) 단일 String
        if let one = raw as? String {
            let u = one.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
            if let v = mapICS[u] { return [v] }
            if let v = mapKR[String(one.prefix(1))] { return [v] }
            if let v = Int(u), (1...7).contains(v) { return [v] }
        }

        // 기본: 전체 요일(매일)
        return [1,2,3,4,5,6,7]
    }
}

