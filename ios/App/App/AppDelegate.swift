
// ios/App/App/AppDelegate.swift
import UIKit
import Capacitor
import UserNotifications
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder,
                   UIApplicationDelegate,
                   UNUserNotificationCenterDelegate,
                   WKScriptMessageHandler {

    var window: UIWindow?

    // ───────────────────────────────────────────
    // 앱 시작: 알림 권한 + JS 브리지 연결
    // ───────────────────────────────────────────
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
        application.registerForRemoteNotifications()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.attachJSBridgeHandler()
        }
        return true
    }

    private func attachJSBridgeHandler() {
        guard let root = self.window?.rootViewController as? CAPBridgeViewController else { return }
        let ctrl = root.bridge?.webView?.configuration.userContentController
        ctrl?.removeScriptMessageHandler(forName: "notify")
        ctrl?.add(self, name: "notify")
    }

    // ───────────────────────────────────────────
    // JS → Native 메시지 처리
    // ───────────────────────────────────────────
    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "notify" else { return }
        guard let dict = message.body as? [String: Any] else { return }
        let action = (dict["action"] as? String ?? "").lowercased()
        let data = dict["payload"] as? [String: Any] ?? dict

        switch action {
        case "schedule":
            scheduleFromPayload(data)
        case "cancel":
            if let id = data["id"] as? String {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
            }
        case "purge", "purgebase":
            if let baseId = data["baseId"] as? String { purgeBase(baseId) }
        default:
            break
        }
    }

    private func purgeBase(_ base: String) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            let ids = reqs.filter { $0.identifier.hasPrefix(base) }.map { $0.identifier }
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
        }
    }

    // ───────────────────────────────────────────
    // 알림 스케줄링
    // ───────────────────────────────────────────
    private func scheduleFromPayload(_ p: [String: Any]) {
        let center = UNUserNotificationCenter.current()
        let id = p["id"] as? String ?? UUID().uuidString
        let title = p["title"] as? String ?? p["name"] as? String ?? "알람"
        let body = p["body"] as? String ?? ""
        let repeatMode = (p["repeatMode"] as? String ?? "").lowercased()

        // 사운드: 없더라도 개소리로
        let soundName = (p["sound"] as? String) ?? "ruffysound001.wav"

        let content = UNMutableNotificationContent()
        content.title = title
        if !body.isEmpty { content.body = body }
        content.sound = UNNotificationSound(named: UNNotificationSoundName(soundName))

        // 시간
        let alarm = p["alarm"] as? [String: Any]
        let hour = (alarm?["hour"] as? NSNumber)?.intValue
                 ?? (p["hour"] as? NSNumber)?.intValue
                 ?? 9
        let minute = (alarm?["minute"] as? NSNumber)?.intValue
                   ?? (p["minute"] as? NSNumber)?.intValue
                   ?? 0

        func trigger(hour: Int, minute: Int,
                     weekday: Int? = nil,
                     monthDay: Int? = nil,
                     repeats: Bool) -> UNCalendarNotificationTrigger {
            var comps = DateComponents()
            comps.hour = hour
            comps.minute = minute
            if let wd = weekday { comps.weekday = wd }
            if let md = monthDay { comps.day = md }
            return UNCalendarNotificationTrigger(dateMatching: comps, repeats: repeats)
        }

        switch repeatMode {
        case "daily":
            let req = UNNotificationRequest(
                identifier: id,
                content: content,
                trigger: trigger(hour: hour, minute: minute, repeats: true)
            )
            center.add(req)

        case "weekly":
            let weekdays = (p["weekdays"] as? [Int]) ?? []
            if weekdays.isEmpty {
                let wd = (p["weekday"] as? NSNumber)?.intValue
                if let w = wd {
                    let req = UNNotificationRequest(
                        identifier: id,
                        content: content,
                        trigger: trigger(hour: hour, minute: minute, weekday: Int(w), repeats: true)
                    )
                    center.add(req)
                }
            } else {
                for w in weekdays {
                    let subId = "\(id)__wd\(w)"
                    let req = UNNotificationRequest(
                        identifier: subId,
                        content: content,
                        trigger: trigger(hour: hour, minute: minute, weekday: w, repeats: true)
                    )
                    center.add(req)
                }
            }

        case "monthly":
            let days = (p["monthDays"] as? [Int]) ?? []
            if days.isEmpty {
                if let md = (p["day"] as? NSNumber)?.intValue {
                    let req = UNNotificationRequest(
                        identifier: id,
                        content: content,
                        trigger: trigger(hour: hour, minute: minute, monthDay: Int(md), repeats: true)
                    )
                    center.add(req)
                }
            } else {
                for md in days {
                    let subId = "\(id)__md\(md)"
                    let req = UNNotificationRequest(
                        identifier: subId,
                        content: content,
                        trigger: trigger(hour: hour, minute: minute, monthDay: md, repeats: true)
                    )
                    center.add(req)
                }
            }

        case "once", "today", "single":
            var comps = DateComponents()
            comps.hour = hour
            comps.minute = minute
            let req = UNNotificationRequest(
                identifier: id,
                content: content,
                trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            )
            center.add(req)

        default:
            // fallback: daily
            let req = UNNotificationRequest(
                identifier: id,
                content: content,
                trigger: trigger(hour: hour, minute: minute, repeats: true)
            )
            center.add(req)
        }
    }

    // ───────────────────────────────────────────
    // Delegate
    // ───────────────────────────────────────────
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .list, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        completionHandler()
    }

    // Capacitor 기본 핸들러
    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}


