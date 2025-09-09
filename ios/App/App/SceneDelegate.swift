// ios/App/App/SceneDelegate.swift
import UIKit
import Capacitor
import WebKit
import UserNotifications

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var notifyAttached = false
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

        UNUserNotificationCenter.current().delegate = self

        if !attachNotifyBridgeIfPossible() {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
                _ = self?.attachNotifyBridgeIfPossible()
            }
        }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        UNUserNotificationCenter.current().delegate = self
        _ = attachNotifyBridgeIfPossible()
    }

    @discardableResult
    private func attachNotifyBridgeIfPossible() -> Bool {
        if notifyAttached { return true }
        guard let capVC = findCAP(from: window?.rootViewController),
              let webView = capVC.bridge?.webView else {
            return false
        }
        let uc = webView.configuration.userContentController
        uc.removeScriptMessageHandler(forName: "notify")
        uc.add(self, name: "notify")
        notifyAttached = true
        print("[iOS] JS bridge attached (scene, fast)")
        return true
    }

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
        guard message.name == "notify",
              let dict = message.body as? [String: Any] else { return }

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
        default:
            break
        }
    }

    // Helpers
    private func int(from any: Any?) -> Int? {
        if let n = any as? NSNumber { return n.intValue }
        if let s = any as? String, let n = Int(s.trimmingCharacters(in: .whitespaces)) { return n }
        return nil
    }

    private func weekdays(from any: Any?) -> [Int] {
        guard let arr = any as? [Any] else { return [] }
        return Array(Set(arr.compactMap { int(from: $0) })).sorted()
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

    // MARK: - Schedule from payload
    private func scheduleFromPayload(_ p: [String: Any]) {
        let center = UNUserNotificationCenter.current()
        let id = (p["id"] as? String) ?? UUID().uuidString
        let title = (p["title"] as? String) ?? "알람"
        let body  = (p["body"] as? String) ?? ""
        let mode  = (p["repeatMode"] as? String ?? "").lowercased()

        let content = UNMutableNotificationContent()
        content.title = title
        if !body.isEmpty { content.body = body }
        content.sound = sound(from: p["sound"] as? String)

        let hour = int(from: p["hour"]) ?? 9
        let minute = int(from: p["minute"]) ?? 0

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
            let wds = weekdays(from: p["weekdays"])
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
            let days = (p["monthDays"] as? [Any])?.compactMap { int(from: $0) } ?? []
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
        case "once", "today":
            // ✅ timestamp(sec/ms) 우선 사용, 없으면 시간만으로 1회 예약
            if let tsAny = p["timestamp"] {
                var sec: TimeInterval?
                if let n = tsAny as? NSNumber {
                    sec = n.doubleValue > 1e11 ? n.doubleValue / 1000 : n.doubleValue
                } else if let s = tsAny as? String, let d = Double(s) {
                    sec = d > 1e11 ? d / 1000 : d
                }
                if let s = sec, s > Date().timeIntervalSince1970 {
                    let date = Date(timeIntervalSince1970: s)
                    let comps = Calendar.current.dateComponents([.year,.month,.day,.hour,.minute,.second], from: date)
                    let trig = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
                    center.add(UNNotificationRequest(identifier: id, content: content, trigger: trig))
                    break
                }
            }
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

    private func scheduleRoutineByEpochs(_ p: [String: Any]) {
        let center = UNUserNotificationCenter.current()
        let rid = (p["routineId"] as? String) ?? "routine-\(UUID().uuidString)"
        let title = (p["title"] as? String) ?? "알람"
        let body  = (p["body"] as? String) ?? ""

        let content = UNMutableNotificationContent()
        content.title = title
        if !body.isEmpty { content.body = body }
        content.sound = sound(from: p["sound"] as? String)

        let list = (p["fireTimesEpoch"] as? [Any]) ?? []
        let now = Date().timeIntervalSince1970
        for v in list {
            var sec: TimeInterval?
            if let n = v as? NSNumber { sec = n.doubleValue > 1e11 ? n.doubleValue/1000 : n.doubleValue }
            if let s = v as? String, let d = Double(s) { sec = d > 1e11 ? d/1000 : d }
            guard let s = sec, s > now else { continue }
            let date = Date(timeIntervalSince1970: s)
            let comps = Calendar.current.dateComponents([.year,.month,.day,.hour,.minute,.second], from: date)
            let nid = "\(rid)__t\(Int(s))"
            let trig = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            center.add(UNNotificationRequest(identifier: nid, content: content, trigger: trig))
        }
        print("[iOS] scheduleRoutineByEpochs rid=\(rid)")
    }
}

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

