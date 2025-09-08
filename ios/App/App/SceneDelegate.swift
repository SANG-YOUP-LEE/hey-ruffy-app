// ios/App/App/SceneDelegate.swift
import UIKit
import Capacitor
import WebKit
import UserNotifications

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    // 브리지 중복 부착 방지
    private var notifyAttached = false
    // 프로그램적으로 CAPBridge 올림
    private let USE_PROGRAMMATIC_ROOT = true

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {

        guard let windowScene = scene as? UIWindowScene else { return }

        if USE_PROGRAMMATIC_ROOT {
            let bridgeVC = CAPBridgeViewController()
            let win = UIWindow(windowScene: windowScene)
            win.rootViewController = bridgeVC
            self.window = win
            win.makeKeyAndVisible()
            print("[iOS] Root set programmatically -> CAPBridgeViewController")
        }

        // 포그라운드 알림 표시 보장
        UNUserNotificationCenter.current().delegate = self

        // 바로 한 번 붙여보고, 준비 전이면 200ms 후 1회만 재시도
        if !attachNotifyBridgeIfPossible() {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
                _ = self?.attachNotifyBridgeIfPossible()
            }
        }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // 혹시 다른 플러그인이 덮어쓴 경우를 대비해 활성화 시 한 번 더 지정
        UNUserNotificationCenter.current().delegate = self
        // 이미 붙었으면 스킵됨
        _ = attachNotifyBridgeIfPossible()
    }

    @discardableResult
    private func attachNotifyBridgeIfPossible() -> Bool {
        if notifyAttached { return true }
        guard let capVC = findCAP(from: window?.rootViewController) else {
            // CAPBridge 아직 준비 전: 여기서 무한 재시도하지 않음
            return false
        }
        guard let webView = capVC.bridge?.webView else {
            return false
        }

        let uc = webView.configuration.userContentController
        uc.removeScriptMessageHandler(forName: "notify")
        uc.add(self, name: "notify")
        notifyAttached = true
        print("[iOS] JS bridge attached (scene, fast)")
        return true
    }

    // 컨테이너(네비/탭) 내부까지 탐색
    private func findCAP(from vc: UIViewController?) -> CAPBridgeViewController? {
        if let c = vc as? CAPBridgeViewController { return c }
        if let nav = vc as? UINavigationController {
            return findCAP(from: nav.visibleViewController) ?? findCAP(from: nav.topViewController)
        }
        if let tab = vc as? UITabBarController {
            return findCAP(from: tab.selectedViewController)
        }
        for child in vc?.children ?? [] {
            if let found = findCAP(from: child) { return found }
        }
        if let presented = vc?.presentedViewController {
            return findCAP(from: presented)
        }
        return nil
    }
}

// MARK: - JS Bridge Handler
extension SceneDelegate: WKScriptMessageHandler {

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "notify" else { return }
        guard let dict = message.body as? [String: Any] else { return }

        let action = (dict["action"] as? String ?? "").lowercased()
        let data   = (dict["payload"] as? [String: Any]) ?? dict
        print("[iOS] notify action=\(action) payload=\(data)")

        switch action {
        case "schedule":
            scheduleFromPayload(data)

        case "setscheduleforroutine":
            scheduleRoutineByEpochs(data)

        case "cancel":
            if let id = data["id"] as? String {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
                print("[iOS] cancel id=\(id)")
            }

        case "purge", "purgebase":
            if let baseId = data["baseId"] as? String { purgeBase(baseId) }

        case "dumppending":
            dumpPending(tag: data["tag"] as? String ?? "manual")

        case "debugping":
            let sec = int(from: data["seconds"]) ?? 5
            debugPing(after: sec)

        default:
            break
        }
    }

    // MARK: - Helpers
    private func int(from any: Any?) -> Int? {
        if let n = any as? NSNumber { return n.intValue }
        if let s = any as? String, let n = Int(s.trimmingCharacters(in: .whitespaces)) { return n }
        return nil
    }

    private func weekdays(from any: Any?) -> [Int] {
        guard let arr = any as? [Any] else { return [] }
        var out: [Int] = []
        for v in arr {
            if let n = int(from: v) { out.append(n) }
        }
        return Array(Set(out)).sorted()
    }

    private func purgeBase(_ base: String) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            let ids = reqs.filter { $0.identifier.hasPrefix(base) }.map { $0.identifier }
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
            print("[iOS] purged base=\(base) removed=\(ids.count)")
        }
    }

    private func dumpPending(tag: String) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            print("[iOS] dumpPending(\(tag)) count=\(reqs.count)")
            for r in reqs {
                print(" - id=\(r.identifier) trigger=\(String(describing: r.trigger))")
            }
        }
    }

    // 사운드 폴백 (.default로 안전)
    private func sound(from nameOrNil: String?) -> UNNotificationSound {
        let chosen = (nameOrNil?.isEmpty == false) ? nameOrNil! : "ruffysound001.wav"
        let base = (chosen as NSString).deletingPathExtension
        let ext  = (chosen as NSString).pathExtension.isEmpty ? "wav" : (chosen as NSString).pathExtension
        if Bundle.main.url(forResource: base, withExtension: ext) != nil {
            return UNNotificationSound(named: UNNotificationSoundName("\(base).\(ext)"))
        } else {
            return .default
        }
    }

    // MARK: - Quick test
    private func debugPing(after sec: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Ping"
        content.body  = "debugPing \(sec)s"
        content.sound = sound(from: "ruffysound001.wav")

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(max(1, sec)), repeats: false)
        let req = UNNotificationRequest(identifier: "debugPing__\(UUID().uuidString)", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(req)
        print("[iOS] debugPing scheduled in \(sec)s")
    }

    // MARK: - Schedule by generic payload
    private func scheduleFromPayload(_ p: [String: Any]) {
        let center = UNUserNotificationCenter.current()
        let id = (p["id"] as? String) ?? UUID().uuidString
        let title = (p["title"] as? String) ?? (p["name"] as? String) ?? "알람"
        let body  = (p["body"] as? String) ?? ""
        let mode  = (p["repeatMode"] as? String ?? "").lowercased()

        let content = UNMutableNotificationContent()
        content.title = title
        if !body.isEmpty { content.body = body }
        content.sound = sound(from: p["sound"] as? String)

        let alarm = p["alarm"] as? [String: Any]
        let hour = int(from: alarm?["hour"]) ?? int(from: p["hour"]) ?? 9
        let minute = int(from: alarm?["minute"]) ?? int(from: p["minute"]) ?? 0

        func trig(hour: Int, minute: Int, weekday: Int? = nil, monthDay: Int? = nil, repeats: Bool) -> UNCalendarNotificationTrigger {
            var comps = DateComponents()
            comps.hour = hour
            comps.minute = minute
            if let wd = weekday { comps.weekday = wd }
            if let md = monthDay { comps.day = md }
            return UNCalendarNotificationTrigger(dateMatching: comps, repeats: repeats)
        }

        switch mode {
        case "daily":
            center.add(UNNotificationRequest(identifier: id, content: content,
                                             trigger: trig(hour: hour, minute: minute, repeats: true)))

        case "weekly":
            let wds = weekdays(from: p["weekdays"]).isEmpty
                ? (int(from: p["weekday"]).map { [$0] } ?? [])
                : weekdays(from: p["weekdays"])
            if wds.isEmpty {
                center.add(UNNotificationRequest(identifier: id, content: content,
                                                 trigger: trig(hour: hour, minute: minute, repeats: true)))
            } else {
                for w in wds {
                    let subId = "\(id)__wd\(w)"
                    center.add(UNNotificationRequest(identifier: subId, content: content,
                                                     trigger: trig(hour: hour, minute: minute, weekday: w, repeats: true)))
                }
            }

        case "monthly":
            let raw = (p["monthDays"] as? [Any]) ?? []
            let days = raw.compactMap { int(from: $0) }
            if days.isEmpty, let d = int(from: p["day"]) {
                center.add(UNNotificationRequest(identifier: id, content: content,
                                                 trigger: trig(hour: hour, minute: minute, monthDay: d, repeats: true)))
            } else {
                for d in days {
                    let subId = "\(id)__md\(d)"
                    center.add(UNNotificationRequest(identifier: subId, content: content,
                                                     trigger: trig(hour: hour, minute: minute, monthDay: d, repeats: true)))
                }
            }

        case "once", "today", "single":
            var comps = DateComponents()
            comps.hour = hour
            comps.minute = minute
            center.add(UNNotificationRequest(identifier: id, content: content,
                                             trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)))

        default:
            center.add(UNNotificationRequest(identifier: id, content: content,
                                             trigger: trig(hour: hour, minute: minute, repeats: true)))
        }

        print("[iOS] scheduleFromPayload done id=\(id) mode=\(mode)")
    }

    // MARK: - Schedule by epoch list
    private func scheduleRoutineByEpochs(_ p: [String: Any]) {
        let center = UNUserNotificationCenter.current()
        let rid = (p["routineId"] as? String) ?? (p["id"] as? String) ?? "routine-\(UUID().uuidString)"
        let title = (p["title"] as? String) ?? "알람"
        let body  = (p["body"] as? String) ?? ""

        let content = UNMutableNotificationContent()
        content.title = title
        if !body.isEmpty { content.body = body }
        content.sound = sound(from: p["sound"] as? String)

        let list = (p["fireTimesEpoch"] as? [Any]) ?? []
        var count = 0
        let now = Date().timeIntervalSince1970

        for v in list {
            var sec: TimeInterval?
            if let n = v as? NSNumber {
                let d = n.doubleValue
                sec = (d > 1e11) ? d / 1000.0 : d
            } else if let s = v as? String, let d = Double(s) {
                sec = (d > 1e11) ? d / 1000.0 : d
            }
            guard let s = sec, s > now else { continue }
            let date = Date(timeIntervalSince1970: s)
            let comps = Calendar.current.dateComponents([.year,.month,.day,.hour,.minute,.second], from: date)
            let nid = "\(rid)__t\(Int(s))"
            let trig = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            let req  = UNNotificationRequest(identifier: nid, content: content, trigger: trig)
            center.add(req)
            count += 1
        }
        print("[iOS] scheduleRoutineByEpochs rid=\(rid) scheduled=\(count)")
    }
}

// 포그라운드에서도 배너/사운드
extension SceneDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("[iOS] willPresent (scene) -> show banner+sound")
        completionHandler([.banner, .sound, .list, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        print("[iOS] didReceive (scene) id=\(response.notification.request.identifier)")
        completionHandler()
    }
}

