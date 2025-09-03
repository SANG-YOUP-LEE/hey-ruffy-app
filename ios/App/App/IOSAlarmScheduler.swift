import Foundation
import UserNotifications
import UIKit

struct IOSAlarmScheduler {

    // === Debug: pending dump ===
    static func dumpPendingWithNextDates(tag: String = "dump") {
        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            print("==== PENDING[\(tag)] \(reqs.count) ====")
            let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd HH:mm:ss"
            for r in reqs {
                if let trig = r.trigger as? UNCalendarNotificationTrigger,
                   let next = trig.nextTriggerDate() {
                    print(" -", r.identifier, "| next:", fmt.string(from: next))
                } else {
                    print(" -", r.identifier, "| next: (non-calendar or nil)")
                }
            }
            print("==== END PENDING[\(tag)] ====")
        }
    }

    // == identifiers / keys ==
    private static func onceIdentifier(for baseId: String) -> String { "\(baseId)-once" }
    private static func threadKey(for baseId: String) -> String { "heyruffy.\(baseId)" }
    private static let dedupSlack: TimeInterval = 30

    // MARK: - Cancel (quiet when 0)
    static func cancel(byPrefix prefix: String) {
        let c = UNUserNotificationCenter.current()
        c.getPendingNotificationRequests { reqs in
            let ids = reqs.map { $0.identifier }.filter { $0.hasPrefix(prefix) }
            if !ids.isEmpty {
                c.removePendingNotificationRequests(withIdentifiers: ids)
                print("cancelled:", ids.count, "byPrefix:", prefix)
            }
        }
    }

    // MARK: - Once
    static func scheduleOnce(at date: Date, id: String, line1: String, line2: String, line3: String, soundName: String) {
        let center = UNUserNotificationCenter.current()
        let key = threadKey(for: id)

        existsPending(at: date, baseId: id) { exists in
            if exists { print("dedup: once skipped"); return }
            center.removePendingNotificationRequests(withIdentifiers: [onceIdentifier(for: id)])

            let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: key)
            var comps = Calendar.current.dateComponents([.year,.month,.day,.hour,.minute,.second], from: date)
            comps.second = comps.second ?? 0
            let trig = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            let req = UNNotificationRequest(identifier: onceIdentifier(for: id), content: content, trigger: trig)
            center.add(req) { e in
                print("once add:", e as Any)
                dumpPendingWithNextDates(tag: "once")
            }
        }
    }

    // MARK: - Daily / N days
    static func scheduleDaily(hour: Int, minute: Int, intervalDays: Int, startDate: String?, baseId: String,
                              line1: String, line2: String, line3: String, soundName: String) {
        let cal = Calendar.current
        let now = Date()
        let anchor: Date = {
            if let ymd = startDate, let d = dateFrom(ymd: ymd, hour: hour, minute: minute) { return d }
            return cal.date(bySettingHour: hour, minute: minute, second: 0, of: now) ?? now
        }()

        if intervalDays == 1 {
            var first = anchor
            if first <= now { first = cal.date(byAdding: .day, value: 1, to: first)! }
            existsPending(at: first, baseId: baseId) { exists in
                if exists { print("dedup: daily(d1) skipped"); return }
                var comp = DateComponents(); comp.hour = hour; comp.minute = minute
                let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: threadKey(for: baseId))
                let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: true)
                let req = UNNotificationRequest(identifier: "\(baseId)-d1", content: content, trigger: trig)
                UNUserNotificationCenter.current().add(req) { e in print("daily(d1) add:", e as Any) }
            }
            return
        }

        var first = anchor
        while first <= now { first = cal.date(byAdding: .day, value: intervalDays, to: first)! }
        existsPending(at: first, baseId: baseId) { exists in
            if exists { print("dedup: daily(d\(intervalDays)) skipped"); return }
            let center = UNUserNotificationCenter.current()
            let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: threadKey(for: baseId))
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

    // MARK: - Weekly / N weeks
    static func scheduleWeekly(hour: Int, minute: Int, intervalWeeks: Int, weekdays: [Int], baseId: String,
                               line1: String, line2: String, line3: String, soundName: String) {
        let center = UNUserNotificationCenter.current()
        let key = threadKey(for: baseId)
        let days = weekdays.isEmpty ? [1,2,3,4,5,6,7] : weekdays

        for w in days {
            if intervalWeeks == 1 {
                // ✅ 반복 트리거: 캘린더/타임존 명시 + nextTrigger 로그
                let repId = "\(baseId)-w1-\(w)"
                center.removePendingNotificationRequests(withIdentifiers: [repId])

                var comp = DateComponents()
                comp.calendar = Calendar.current
                comp.timeZone = TimeZone.current
                comp.weekday = w; comp.hour = hour; comp.minute = minute; comp.second = 0

                let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: key)
                let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: true)
                let req = UNNotificationRequest(identifier: repId, content: content, trigger: trig)
                center.add(req) { e in
                    if let t = (req.trigger as? UNCalendarNotificationTrigger)?.nextTriggerDate() {
                        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd HH:mm:ss"
                        print("weekly(w1) add: wd=\(w), next=\(f.string(from: t)), err=\(String(describing: e))")
                    } else {
                        print("weekly(w1) add: wd=\(w), next=nil, err=\(String(describing: e))")
                    }
                }
            } else {
                var fire = nextWeekday(w, hour: hour, minute: minute)
                existsPending(at: fire, baseId: baseId) { exists in
                    if exists { print("dedup: weekly(w\(intervalWeeks)) skipped (w\(w))"); return }
                    let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: key)
                    for _ in 0..<26 { // 약 12개월
                        var dc = Calendar.current.dateComponents([.year,.month,.day], from: fire)
                        dc.hour = hour; dc.minute = minute
                        let trig = UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
                        let req = UNNotificationRequest(identifier: "\(baseId)-w\(intervalWeeks)-\(w)-\(Int(fire.timeIntervalSince1970))", content: content, trigger: trig)
                        center.add(req) { e in print("weekly(w\(intervalWeeks)) add:", w, fire, e as Any) }
                        fire = Calendar.current.date(byAdding: .weekOfYear, value: intervalWeeks, to: fire)!
                    }
                }
            }
        }
    }

    // MARK: - Monthly (12개월 선예약)
    static func scheduleMonthly(day: Int, hour: Int, minute: Int, baseId: String,
                                line1: String, line2: String, line3: String, soundName: String) {
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
                        let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: key)
                        let trig = UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
                        let req = UNNotificationRequest(identifier: "\(baseId)-m-\(Int(fire.timeIntervalSince1970))", content: content, trigger: trig)
                        center.add(req) { e in print("monthly add:", i, e as Any) }
                    }
                }
            }
        }
    }

    // MARK: - De-dup helper
    private static func existsPending(at fireDate: Date, baseId: String, completion: @escaping (Bool)->Void) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            let key = threadKey(for: baseId)
            for r in reqs {
                guard let trig = r.trigger as? UNCalendarNotificationTrigger,
                      let next = trig.nextTriggerDate() else { continue }
                if r.content.threadIdentifier == key && abs(next.timeIntervalSince(fireDate)) <= dedupSlack {
                    completion(true); return
                }
            }
            completion(false)
        }
    }

    // MARK: - Content builder (3줄)
    private static func buildContent(line1: String, line2: String, line3: String, soundName: String, threadKey: String) -> UNMutableNotificationContent {
        let c = UNMutableNotificationContent()
        c.title = line1
        c.subtitle = line2
        c.body = line3
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

    // MARK: - Helpers
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
            let p = ymd.split(separator: "-").map { Int($0) ?? 0 }
            if p.count == 3 { return p[2] }
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

    // MARK: - Debug ping (20s)
    static func debugPing(after seconds: TimeInterval = 20, baseId: String = "debug") {
        let c = UNUserNotificationCenter.current()
        c.removePendingNotificationRequests(withIdentifiers: ["\(baseId)-ping"])
        let content = UNMutableNotificationContent()
        content.title = "HeyRuffy (PING)"
        content.subtitle = "디버그 핑"
        content.body = "지금으로부터 \(Int(seconds))초 후 트리거"
        if #available(iOS 15.0, *) { content.interruptionLevel = .timeSensitive }
        content.sound = .default
        let fire = Date().addingTimeInterval(seconds)
        let dc = Calendar.current.dateComponents([.year,.month,.day,.hour,.minute,.second], from: fire)
        let trig = UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
        let req = UNNotificationRequest(identifier: "\(baseId)-ping", content: content, trigger: trig)
        c.add(req) { e in
            print("debug ping add:", e as Any, "|", fire)
            dumpPendingWithNextDates(tag: "after-ping")
        }
    }
}

