// ios/App/App/SceneDelegate.swift
import UIKit
import Capacitor
import WebKit
import UserNotifications

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var notifyAttached = false  // JS 브리지 중복 방지

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        // 스토리보드(Main)를 쓰고 있어서 window/rootVC는 건드릴 필요 없음.
        // 다만 WebKit 브리지는 씬 구동 직후에 붙여야 안정적.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.attachNotifyBridgeIfNeeded()
        }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // 웹뷰 재초기화 타이밍 대비: 활성화 시에도 1회 보강
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.attachNotifyBridgeIfNeeded()
        }
    }

    private func attachNotifyBridgeIfNeeded() {
        guard !notifyAttached else { return }
        guard
            let root = window?.rootViewController as? CAPBridgeViewController,
            let ucc  = root.bridge?.webView?.configuration.userContentController
        else { return }

        ucc.removeScriptMessageHandler(forName: "notify")
        ucc.add(self, name: "notify")
        notifyAttached = true
        print("[iOS] JS bridge attached (scene)")
    }
}

extension SceneDelegate: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "notify" else { return }
        guard let dict = message.body as? [String: Any] else { return }

        let action = (dict["action"] as? String ?? "").lowercased()
        let data   = dict["payload"] as? [String: Any] ?? dict
        print("[iOS] notify action=\(action) payload=\(data)")

        switch action {
        case "schedule":
            scheduleFromPayload(data)
        case "cancel":
            if let id = data["id"] as? String {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
                print("[iOS] cancel id=\(id)")
            }
        case "purge", "purgebase":
            if let baseId = data["baseId"] as? String { purgeBase(baseId) }
        case "dumpPending":
            UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
                print("[iOS] pending count=\(reqs.count)")
                for r in reqs { print(" - \(r.identifier)") }
            }
        default:
            break
        }
    }

    private func purgeBase(_ base: String) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            let ids = reqs.filter { $0.identifier.hasPrefix(base) }.map { $0.identifier }
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
            print("[iOS] purged base=\(base) removed=\(ids.count)")
        }
    }

    /// 알림 스케줄러 (개소리 ruffysound001.wav 사용)
    private func scheduleFromPayload(_ p: [String: Any]) {
        let center = UNUserNotificationCenter.current()
        let id = p["id"] as? String ?? UUID().uuidString
        let title = (p["title"] as? String) ?? (p["name"] as? String) ?? "알람"
        let body = p["body"] as? String ?? ""
        let repeatMode = (p["repeatMode"] as? String ?? "").lowercased()
        let soundName = (p["sound"] as? String) ?? "ruffysound001.wav"

        let content = UNMutableNotificationContent()
        content.title = title
        if !body.isEmpty { content.body = body }
        content.sound = UNNotificationSound(named: UNNotificationSoundName(soundName))

        let alarm = p["alarm"] as? [String: Any]
        let hour = (alarm?["hour"] as? NSNumber)?.intValue
               ?? (p["hour"] as? NSNumber)?.intValue ?? 9
        let minute = (alarm?["minute"] as? NSNumber)?.intValue
                 ?? (p["minute"] as? NSNumber)?.intValue ?? 0

        func trig(hour: Int, minute: Int, weekday: Int? = nil, monthDay: Int? = nil, repeats: Bool) -> UNCalendarNotificationTrigger {
            var comps = DateComponents()
            comps.hour = hour
            comps.minute = minute
            if let wd = weekday { comps.weekday = wd }   // 1=일 … 7=토
            if let md = monthDay { comps.day = md }
            return UNCalendarNotificationTrigger(dateMatching: comps, repeats: repeats)
        }

        switch repeatMode {
        case "daily":
            center.add(UNNotificationRequest(identifier: id, content: content, trigger: trig(hour: hour, minute: minute, repeats: true)))

        case "weekly":
            let raw = (p["weekdays"] as? [Any]) ?? []
            let weekdays: [Int] = raw.compactMap {
                if let n = $0 as? NSNumber { return n.intValue }
                if let s = $0 as? String, let n = Int(s) { return n }
                return nil
            }
            if weekdays.isEmpty {
                if let w = (p["weekday"] as? NSNumber)?.intValue {
                    center.add(UNNotificationRequest(identifier: id, content: content, trigger: trig(hour: hour, minute: minute, weekday: Int(w), repeats: true)))
                }
            } else {
                for w in weekdays {
                    let subId = "\(id)__wd\(w)"
                    center.add(UNNotificationRequest(identifier: subId, content: content, trigger: trig(hour: hour, minute: minute, weekday: w, repeats: true)))
                }
            }

        case "monthly":
            let raw = (p["monthDays"] as? [Any]) ?? []
            let days: [Int] = raw.compactMap {
                if let n = $0 as? NSNumber { return n.intValue }
                if let s = $0 as? String, let n = Int(s) { return n }
                return nil
            }
            if days.isEmpty {
                if let md = (p["day"] as? NSNumber)?.intValue {
                    center.add(UNNotificationRequest(identifier: id, content: content, trigger: trig(hour: hour, minute: minute, monthDay: Int(md), repeats: true)))
                }
            } else {
                for md in days {
                    let subId = "\(id)__md\(md)"
                    center.add(UNNotificationRequest(identifier: subId, content: content, trigger: trig(hour: hour, minute: minute, monthDay: md, repeats: true)))
                }
            }

        case "once", "today", "single":
            var comps = DateComponents()
            comps.hour = hour
            comps.minute = minute
            center.add(UNNotificationRequest(identifier: id, content: content, trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)))

        default:
            center.add(UNNotificationRequest(identifier: id, content: content, trigger: trig(hour: hour, minute: minute, repeats: true)))
        }
    }
}

