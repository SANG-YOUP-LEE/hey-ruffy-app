// File: ios/App/App/AppDelegate.swift

import UIKit
import Capacitor
import WebKit
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, WKScriptMessageHandler {

    var window: UIWindow?
    private let soundName = "ruffysound001.wav" // 번들 포함(타겟 App 체크)

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, err in
            print("notif permission:", granted, err as Any)
        }
        attachNotifyHandler()
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        attachNotifyHandler()
    }

    // MARK: - Bridge
    private func attachNotifyHandler() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            if let bridgeVC = self.window?.rootViewController as? CAPBridgeViewController,
               let webView = bridgeVC.webView {
                let ucc = webView.configuration.userContentController
                ucc.removeScriptMessageHandler(forName: "notify")
                ucc.add(self, name: "notify")
                print("WKMessageHandler 'notify' attached")
            }
        }
    }

    // MARK: - Receive from JS
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "notify",
              let dict = message.body as? [String: Any],
              let action = dict["action"] as? String else { return }

        let id = (dict["id"] as? String) ?? "alarm"
        let rawTitle = (dict["title"] as? String) ?? "알람"
        let subtitle = (dict["subtitle"] as? String) ?? ""

        switch action {
        case "cancel":
            IOSAlarmScheduler.cancel(byPrefix: id)

        case "scheduleOnce":
            let ts = (dict["timestamp"] as? Double) ?? 0
            let fire = Date(timeIntervalSince1970: ts/1000.0)
            IOSAlarmScheduler.scheduleOnce(
                at: fire,
                id: id,
                title: "[오늘만] \(rawTitle)",
                subtitle: subtitle,
                soundName: soundName
            )

        case "scheduleDaily":
            let hour = dict["hour"] as? Int ?? 9
            let minute = dict["minute"] as? Int ?? 0
            let interval = max(1, dict["interval"] as? Int ?? 1) // 1=매일, 2+=N일마다
            let startDateStr = dict["startDate"] as? String // "YYYY-MM-DD" 기대
            IOSAlarmScheduler.scheduleDaily(
                hour: hour, minute: minute, intervalDays: interval, startDate: startDateStr, baseId: id,
                title: "[Daily] \(rawTitle)",
                subtitle: subtitle, soundName: soundName
            )

        case "scheduleWeekly":
            let hour = dict["hour"] as? Int ?? 9
            let minute = dict["minute"] as? Int ?? 0
            let weekdays = (dict["weekdays"] as? [Int] ?? [2]).map { min(max($0,1),7) } // 1=일…7=토
            let intervalWeeks = max(1, dict["intervalWeeks"] as? Int ?? 1)
            if Set(weekdays).count == 7 && intervalWeeks == 1 {
                IOSAlarmScheduler.scheduleDaily(
                    hour: hour, minute: minute, intervalDays: 1, startDate: nil, baseId: id,
                    title: "[Daily] \(rawTitle)",
                    subtitle: subtitle, soundName: soundName
                )
            } else {
                IOSAlarmScheduler.scheduleWeekly(
                    hour: hour, minute: minute, intervalWeeks: intervalWeeks, weekdays: weekdays, baseId: id,
                    title: "[Weekly] \(rawTitle)",
                    subtitle: subtitle, soundName: soundName
                )
            }

        case "scheduleMonthly":
            let day = (dict["day"] as? Int) ?? IOSAlarmScheduler.dayFrom(dict: dict)
            let hour = dict["hour"] as? Int ?? 9
            let minute = dict["minute"] as? Int ?? 0
            IOSAlarmScheduler.scheduleMonthly(
                day: day, hour: hour, minute: minute, baseId: id,
                title: "[Monthly] \(rawTitle)",
                subtitle: subtitle, soundName: soundName
            )

        default:
            print("Unknown action:", action)
        }
    }

    // 포그라운드에서도 배너/사운드
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .list])
    }
}

// MARK: - Scheduler + De-Dup
struct IOSAlarmScheduler {

    // == 공통 ==
    private static func onceIdentifier(for baseId: String) -> String { "\(baseId)-once" }
    private static func threadKey(for baseId: String) -> String { "heyruffy.\(baseId)" }
    private static let dedupSlack: TimeInterval = 30 // 같은 분 ±30초는 중복으로 간주

    static func cancel(byPrefix prefix: String) {
        let c = UNUserNotificationCenter.current()
        c.getPendingNotificationRequests { reqs in
            let ids = reqs.map { $0.identifier }.filter { $0.hasPrefix(prefix) }
            c.removePendingNotificationRequests(withIdentifiers: ids)
            print("cancelled:", ids.count, "byPrefix:", prefix)
        }
    }

    // === 중복 탐지: 같은 threadKey(루틴) + 같은 분(±30초) 예약이 있으면 true ===
    private static func existsPending(at fireDate: Date, baseId: String, completion: @escaping (Bool)->Void) {
        let center = UNUserNotificationCenter.current()
        center.getPendingNotificationRequests { reqs in
            let key = threadKey(for: baseId)
            for r in reqs {
                guard let trig = r.trigger as? UNCalendarNotificationTrigger else { continue }
                guard let next = trig.nextTriggerDate() else { continue }
                if r.content.threadIdentifier == key {
                    if abs(next.timeIntervalSince(fireDate)) <= dedupSlack {
                        completion(true); return
                    }
                }
            }
            completion(false)
        }
    }

    // === “오늘만” ===
    static func scheduleOnce(at date: Date, id: String, title: String, subtitle: String, soundName: String) {
        let key = threadKey(for: id)
        existsPending(at: date, baseId: id) { exists in
            if exists { print("dedup: once skipped"); return }
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [onceIdentifier(for: id)])
            let content = buildContent(title: title, subtitle: subtitle, soundName: soundName, threadKey: key)
            var comps = Calendar.current.dateComponents([.year,.month,.day,.hour,.minute,.second], from: date)
            comps.second = comps.second ?? 0
            let trig = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            let req = UNNotificationRequest(identifier: onceIdentifier(for: id), content: content, trigger: trig)
            UNUserNotificationCenter.current().add(req) { e in print("once add:", e as Any, date) }
        }
    }

    // === 매일 / N일마다 (startDate 앵커 반영) ===
    static func scheduleDaily(hour: Int, minute: Int, intervalDays: Int, startDate: String?, baseId: String, title: String, subtitle: String, soundName: String) {
        let cal = Calendar.current
        let now = Date()
        let anchor: Date = {
            if let ymd = startDate, let d = dateFrom(ymd: ymd, hour: hour, minute: minute) {
                return d
            }
            return cal.date(bySettingHour: hour, minute: minute, second: 0, of: now) ?? now
        }()

        var first = anchor
        if intervalDays == 1 {
            if first <= now {
                first = cal.date(byAdding: .day, value: 1, to: first)!
            }
            existsPending(at: first, baseId: baseId) { exists in
                if exists { print("dedup: daily(d1) skipped (conflict @ \(first))"); return }
                var comp = DateComponents(); comp.hour = hour; comp.minute = minute
                let content = buildContent(title: title, subtitle: subtitle, soundName: soundName, threadKey: threadKey(for: baseId))
                let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: true)
                let req = UNNotificationRequest(identifier: "\(baseId)-d1", content: content, trigger: trig)
                UNUserNotificationCenter.current().add(req) { e in print("daily(d1) add:", e as Any) }
            }
            return
        }

        // N일마다: startDate 기준으로 now 이후 첫 트리거로 정렬 + 선예약(최대 120일)
        while first <= now { first = cal.date(byAdding: .day, value: intervalDays, to: first)! }
        existsPending(at: first, baseId: baseId) { exists in
            if exists { print("dedup: daily(d\(intervalDays)) skipped (first @ \(first))"); return }
            let center = UNUserNotificationCenter.current()
            let content = buildContent(title: title, subtitle: subtitle, soundName: soundName, threadKey: threadKey(for: baseId))
            var day = first
            for _ in stride(from: 0, through: 120, by: intervalDays) {
                var dc = cal.dateComponents([.year,.month,.day], from: day)
                dc.hour = hour; dc.minute = minute
                if let fire = cal.date(from: dc) {
                    let trig = UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
                    let req = UNNotificationRequest(identifier: "\(baseId)-d\(intervalDays)-\(Int(fire.timeIntervalSince1970))", content: content, trigger: trig)
                    center.add(req) { e in print("daily(d\(intervalDays)) add:", fire, e as Any) }
                }
                day = cal.date(byAdding: .day, value: intervalDays, to: day)!
            }
        }
    }

    // === 매주(선택 요일) / N주마다 ===
    static func scheduleWeekly(hour: Int, minute: Int, intervalWeeks: Int, weekdays: [Int], baseId: String, title: String, subtitle: String, soundName: String) {
        let key = threadKey(for: baseId)
        let center = UNUserNotificationCenter.current()

        for w in weekdays {
            if intervalWeeks == 1 {
                let next = nextWeekday(w, hour: hour, minute: minute)
                existsPending(at: next, baseId: baseId) { exists in
                    if exists { print("dedup: weekly(w1) skipped (w\(w) @ \(next))"); return }
                    var comp = DateComponents(); comp.weekday = w; comp.hour = hour; comp.minute = minute
                    let content = buildContent(title: title, subtitle: subtitle, soundName: soundName, threadKey: key)
                    let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: true)
                    let req = UNNotificationRequest(identifier: "\(baseId)-w1-\(w)", content: content, trigger: trig)
                    center.add(req) { e in print("weekly(w1) add:", w, e as Any) }
                }
            } else {
                // N주마다: 비반복 트리거를 선예약(약 52주 창)
                var first = nextWeekday(w, hour: hour, minute: minute)
                existsPending(at: first, baseId: baseId) { exists in
                    if exists { print("dedup: weekly(w\(intervalWeeks)) skipped (first w\(w) @ \(first))"); return }
                    let content = buildContent(title: title, subtitle: subtitle, soundName: soundName, threadKey: key)
                    var fire = first
                    for _ in 0..<26 { // 약 1년 커버
                        var comp = Calendar.current.dateComponents([.year,.month,.day], from: fire)
                        comp.hour = hour; comp.minute = minute
                        let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: false)
                        let req = UNNotificationRequest(identifier: "\(baseId)-w\(intervalWeeks)-\(w)-\(Int(fire.timeIntervalSince1970))", content: content, trigger: trig)
                        center.add(req) { e in print("weekly(w\(intervalWeeks)) add:", w, fire, e as Any) }
                        fire = Calendar.current.date(byAdding: .weekOfYear, value: intervalWeeks, to: fire)!
                    }
                }
            }
        }
    }

    // === 매월 ===
    static func scheduleMonthly(day: Int, hour: Int, minute: Int, baseId: String, title: String, subtitle: String, soundName: String) {
        let key = threadKey(for: baseId)
        let cal = Calendar.current
        let center = UNUserNotificationCenter.current()
        let now = Date()

        for i in 0..<12 {
            if let target = cal.date(byAdding: .month, value: i, to: now) {
                var dc = cal.dateComponents([.year,.month], from: target)
                dc.day = min(day, lastDay(of: dc.year!, month: dc.month!))
                dc.hour = hour; dc.minute = minute
                if let fire = cal.date(from: dc) {
                    existsPending(at: fire, baseId: baseId) { exists in
                        if exists { print("dedup: monthly skipped (\(fire))"); return }
                        let content = buildContent(title: title, subtitle: subtitle, soundName: soundName, threadKey: key)
                        let trig = UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
                        let req = UNNotificationRequest(identifier: "\(baseId)-m-\(Int(fire.timeIntervalSince1970))", content: content, trigger: trig)
                        center.add(req) { e in print("monthly add:", i, e as Any) }
                    }
                }
            }
        }
    }

    // === Helpers ===
    private static func buildContent(title: String, subtitle: String, soundName: String, threadKey: String) -> UNMutableNotificationContent {
        let c = UNMutableNotificationContent()
        c.title = title
        c.subtitle = subtitle
        c.body = subtitle
        if let snd = safeSound(named: soundName) { c.sound = snd } else { c.sound = .default }
        c.threadIdentifier = threadKey
        if #available(iOS 15.0, *) { c.interruptionLevel = .timeSensitive }
        return c
    }

    private static func safeSound(named name: String) -> UNNotificationSound? {
        let ns = name as NSString
        let base = ns.deletingPathExtension
        let ext = ns.pathExtension.isEmpty ? "wav" : ns.pathExtension
        if Bundle.main.url(forResource: base, withExtension: ext) != nil {
            return UNNotificationSound(named: UNNotificationSoundName("\(base).\(ext)"))
        }
        return nil
    }

    private static func nextWeekday(_ weekday: Int, hour: Int, minute: Int) -> Date {
        let cal = Calendar.current
        var comps = DateComponents()
        comps.weekday = weekday; comps.hour = hour; comps.minute = minute; comps.second = 0
        let now = Date()
        var next = cal.nextDate(after: now, matching: comps, matchingPolicy: .nextTimePreservingSmallerComponents)!
        if next.timeIntervalSince(now) < 0 { next = cal.date(byAdding: .day, value: 7, to: next)! }
        return next
    }

    static func dayFrom(dict: [String: Any]) -> Int {
        if let ymd = dict["startDate"] as? String, ymd.count == 10 {
            let comps = ymd.split(separator: "-").map { Int($0) ?? 0 }
            if comps.count == 3 { return comps[2] }
        }
        return Calendar.current.component(.day, from: Date())
    }

    private static func lastDay(of year: Int, month: Int) -> Int {
        var c = DateComponents(); c.year = year; c.month = month + 1; c.day = 0
        let d = Calendar.current.date(from: c)!
        return Calendar.current.component(.day, from: d)
    }

    private static func dateFrom(ymd: String, hour: Int, minute: Int) -> Date? {
        let parts = ymd.split(separator: "-")
        guard parts.count == 3,
              let y = Int(parts[0]), let m = Int(parts[1]), let d = Int(parts[2]) else { return nil }
        var comp = DateComponents()
        comp.year = y; comp.month = m; comp.day = d; comp.hour = hour; comp.minute = minute; comp.second = 0
        return Calendar.current.date(from: comp)
    }
}

