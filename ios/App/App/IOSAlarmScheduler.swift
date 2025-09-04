// File: ios/App/App/IOSAlarmScheduler.swift

import Foundation
import UserNotifications
import UIKit

struct IOSAlarmScheduler {

    // ===== Debug =====
    static func dumpPendingWithNextDates(tag: String = "dump") {
        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            print("==== PENDING[\(tag)] \(reqs.count) ====")
            let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd HH:mm:ss"
            for r in reqs {
                if let t = (r.trigger as? UNCalendarNotificationTrigger)?.nextTriggerDate() {
                    print(" -", r.identifier, "| next:", fmt.string(from: t))
                } else if let t = (r.trigger as? UNTimeIntervalNotificationTrigger) {
                    print(" -", r.identifier, "| interval(s):", Int(t.timeInterval), "repeats:", t.repeats)
                } else {
                    print(" -", r.identifier, "| next: (nil)")
                }
            }
            print("==== END PENDING[\(tag)] ====")
        }
    }

    // ===== Canonical ID helpers =====
    private static func idDaily(_ base: String) -> String { "\(base)-d1" }
    private static func idEveryNFirst(_ base: String, n: Int) -> String { "\(base)-d\(n)-first" }
    private static func idEveryN(_ base: String, n: Int) -> String { "\(base)-d\(n)" }
    private static func idWeekly(_ base: String, weekday: Int) -> String { "\(base)-w1-\(weekday)" }
    private static func idWeeklyN(_ base: String, weekday: Int, n: Int) -> String { "\(base)-w\(n)-\(weekday)" }
    private static func idMonthly(_ base: String, day: Int) -> String { "\(base)-m-\(day)" }
    private static func idOnce(_ base: String) -> String { "\(base)-once" }

    private static let dedupSlack: TimeInterval = 30

    // ===== One-shot purge for messy past =====
    static func migrateAndCleanLegacyOnce(legacyPrefixes: [String]) {
        let key = "heyrffy_migr_v3_done"
        let ud = UserDefaults.standard
        guard !ud.bool(forKey: key) else { return }
        ud.set(true, forKey: key)

        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            let ids = reqs.map { $0.identifier }.filter { id in
                legacyPrefixes.contains { p in id.hasPrefix(p) }
            }
            if !ids.isEmpty {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
                print("Legacy cleanup removed:", ids.count)
            }
        }
    }

    // ===== Base purge (모드 전환 시 항상 먼저 호출) =====
    static func purgeAllForBase(baseId: String) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            let ids = reqs.map { $0.identifier }.filter { $0.hasPrefix(baseId) }
            if !ids.isEmpty {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
                print("purgeAllForBase:", baseId, "→ removed:", ids.count)
            }
        }
    }

    // ===== Once =====
    static func scheduleOnce(at date: Date, id: String, line1: String, line2: String, line3: String, soundName: String) {
        let c = UNUserNotificationCenter.current()
        c.removePendingNotificationRequests(withIdentifiers: [idOnce(id)])

        let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: "heyruffy.\(id)")
        var comp = Calendar.current.dateComponents([.year,.month,.day,.hour,.minute,.second], from: date)
        comp.calendar = Calendar.current
        comp.timeZone  = TimeZone.current
        comp.second = comp.second ?? 0

        let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: false)
        let req = UNNotificationRequest(identifier: idOnce(id), content: content, trigger: trig)
        c.add(req) { e in print("once add:", e as Any) }
    }

    // ===== Daily / N days =====
    static func scheduleDaily(hour: Int, minute: Int, intervalDays: Int, startDate: String?, baseId: String,
                              line1: String, line2: String, line3: String, soundName: String) {
        let cal = Calendar.current
        let now = Date()
        let anchor: Date = {
            if let ymd = startDate, let d = dateFrom(ymd: ymd, hour: hour, minute: minute) { return d }
            return cal.date(bySettingHour: hour, minute: minute, second: 0, of: now) ?? now
        }()

        // d1: 매일
        if intervalDays <= 1 {
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [idDaily(baseId)])

            var comp = DateComponents()
            comp.calendar = Calendar.current           // ✅ 명시
            comp.timeZone  = TimeZone.current          // ✅ 명시
            comp.hour = hour
            comp.minute = minute
            comp.second = 0

            let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: true)
            let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: "heyruffy.\(baseId)")
            let req = UNNotificationRequest(identifier: idDaily(baseId), content: content, trigger: trig)

            UNUserNotificationCenter.current().add(req) { e in
                if let t = (req.trigger as? UNCalendarNotificationTrigger)?.nextTriggerDate() {
                    let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd HH:mm:ss"
                    print("daily(d1) add: next=\(f.string(from: t)), err=\(String(describing: e))")
                } else {
                    print("daily(d1) add: next=nil, err=\(String(describing: e))")
                }
            }
            return
        }

        // dN: N일마다 (두 건만: 첫 1회 + 반복)
        var first = anchor
        while first <= now { first = cal.date(byAdding: .day, value: intervalDays, to: first)! }

        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [
            idEveryN(baseId, n: intervalDays),
            idEveryNFirst(baseId, n: intervalDays)
        ])

        let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: "heyruffy.\(baseId)")

        let firstSec = max(60, first.timeIntervalSinceNow)
        let firstTrig = UNTimeIntervalNotificationTrigger(timeInterval: firstSec, repeats: false)
        let firstReq = UNNotificationRequest(identifier: idEveryNFirst(baseId, n: intervalDays), content: content, trigger: firstTrig)
        center.add(firstReq) { e in print("daily(d\(intervalDays)) first add:", e as Any) }

        let interval = TimeInterval(intervalDays * 86400)
        let repTrig = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: true)
        let repReq = UNNotificationRequest(identifier: idEveryN(baseId, n: intervalDays), content: content, trigger: repTrig)
        center.add(repReq) { e in print("daily(d\(intervalDays)) repeat add:", e as Any) }
    }

    // ===== Weekly / N weeks =====
    static func scheduleWeekly(hour: Int, minute: Int, intervalWeeks: Int, weekdays: [Int], baseId: String,
                               line1: String, line2: String, line3: String, soundName: String) {
        let center = UNUserNotificationCenter.current()
        let days = weekdays.isEmpty ? [1,2,3,4,5,6,7] : weekdays

        if intervalWeeks <= 1 {
            let ids = days.map { idWeekly(baseId, weekday: $0) }
            center.removePendingNotificationRequests(withIdentifiers: ids)
            for w in days {
                var comp = DateComponents()
                comp.calendar = Calendar.current
                comp.timeZone = TimeZone.current
                comp.weekday = w; comp.hour = hour; comp.minute = minute; comp.second = 0
                let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: true)
                let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: "heyruffy.\(baseId)")
                let req = UNNotificationRequest(identifier: idWeekly(baseId, weekday: w), content: content, trigger: trig)
                center.add(req) { e in print("weekly(w1) add: wd=\(w)", e as Any) }
            }
            return
        }

        // wN: 격N주 (요일별 두 건: first + repeat)
        let secs = max(60, intervalWeeks * 7 * 86400)
        let ids = days.map { idWeeklyN(baseId, weekday: $0, n: intervalWeeks) }
        center.removePendingNotificationRequests(withIdentifiers: ids)

        for w in days {
            let first = nextWeekday(w, hour: hour, minute: minute)
            let firstGap = max(60, first.timeIntervalSinceNow)
            let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: "heyruffy.\(baseId)")

            let firstId = idWeeklyN(baseId, weekday: w, n: intervalWeeks) + "-first"
            center.removePendingNotificationRequests(withIdentifiers: [firstId])
            let firstTrig = UNTimeIntervalNotificationTrigger(timeInterval: firstGap, repeats: false)
            center.add(UNNotificationRequest(identifier: firstId, content: content, trigger: firstTrig)) { e in
                print("weekly(w\(intervalWeeks)) first add: wd=\(w)", e as Any)
            }

            let repTrig = UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(secs), repeats: true)
            center.add(UNNotificationRequest(identifier: idWeeklyN(baseId, weekday: w, n: intervalWeeks),
                                             content: content, trigger: repTrig)) { e in
                print("weekly(w\(intervalWeeks)) repeat add: wd=\(w)", e as Any)
            }
        }
    }

    // ===== Monthly =====
    static func scheduleMonthly(day: Int, hour: Int, minute: Int, baseId: String,
                                line1: String, line2: String, line3: String, soundName: String) {
        let id = idMonthly(baseId, day: day)
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])

        var comp = DateComponents()
        comp.calendar = Calendar.current
        comp.timeZone = TimeZone.current
        comp.day = day
        comp.hour = hour
        comp.minute = minute
        comp.second = 0

        let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: "heyruffy.\(baseId)")
        let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: true)
        let req = UNNotificationRequest(identifier: id, content: content, trigger: trig)
        UNUserNotificationCenter.current().add(req) { e in print("monthly add:", e as Any) }
    }

    // ===== Helpers =====
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

    private static func dateFrom(ymd: String, hour: Int, minute: Int) -> Date? {
        let p = ymd.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3 else { return nil }
        var comp = DateComponents()
        comp.calendar = Calendar.current
        comp.timeZone  = TimeZone.current
        comp.year = p[0]; comp.month = p[1]; comp.day = p[2]
        comp.hour = hour; comp.minute = minute; comp.second = 0
        return Calendar.current.date(from: comp)
    }

    private static func nextWeekday(_ weekday: Int, hour: Int, minute: Int) -> Date {
        var comps = DateComponents()
        comps.calendar = Calendar.current
        comps.timeZone  = TimeZone.current
        comps.weekday = weekday; comps.hour = hour; comps.minute = minute; comps.second = 0
        let now = Date()
        var next = Calendar.current.nextDate(after: now, matching: comps, matchingPolicy: .nextTimePreservingSmallerComponents)!
        if next.timeIntervalSince(now) < 0 { next = Calendar.current.date(byAdding: .day, value: 7, to: next)! }
        return next
    }

    static func dayFrom(dict: [String: Any]) -> Int {
        if let ymd = dict["startDate"] as? String, ymd.count == 10 {
            let p = ymd.split(separator: "-").compactMap { Int($0) }
            if p.count == 3 { return p[2] }
        }
        return Calendar.current.component(.day, from: Date())
    }

    // IOSAlarmScheduler.swift 맨 아래 Helpers 근처에 추가
    static func shouldSkipPurge(baseId: String, windowSec: TimeInterval = 120) -> Bool {
        var skip = false
        let now = Date()
        let sema = DispatchSemaphore(value: 0)

        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            for r in reqs where r.identifier.hasPrefix(baseId) {
                if let cal = r.trigger as? UNCalendarNotificationTrigger,
                   let next = cal.nextTriggerDate() {
                    if abs(next.timeIntervalSince(now)) <= windowSec { skip = true; break }
                } else if let ti = r.trigger as? UNTimeIntervalNotificationTrigger {
                    // 첫 발사 대기 중인 timeInterval(비반복)이 창 안이라면 스킵
                    if !ti.repeats && ti.timeInterval <= windowSec { skip = true; break }
                }
            }
            sema.signal()
        }
        _ = sema.wait(timeout: .now() + 1.0) // 짧게 동기화
        return skip
    }
  
  // ===== Debug ping =====
    static func debugPing(after seconds: TimeInterval = 20, baseId: String = "debug") {
        let id = "\(baseId)-ping"
        let c = UNUserNotificationCenter.current()
        c.removePendingNotificationRequests(withIdentifiers: [id])
        let content = UNMutableNotificationContent()
        content.title = "HeyRuffy (PING)"
        content.subtitle = "디버그 핑"
        content.body = "지금으로부터 \(Int(seconds))초 후 트리거"
        if #available(iOS 15.0, *) { content.interruptionLevel = .timeSensitive }
        content.sound = .default
        let fire = Date().addingTimeInterval(seconds)
        var dc = Calendar.current.dateComponents([.year,.month,.day,.hour,.minute,.second], from: fire)
        dc.calendar = Calendar.current
        dc.timeZone  = TimeZone.current
        let trig = UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
        let req = UNNotificationRequest(identifier: id, content: content, trigger: trig)
        c.add(req) { e in print("debug ping add:", e as Any, "|", fire) }
    }
}

