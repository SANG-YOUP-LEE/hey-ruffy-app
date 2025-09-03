// File: ios/App/App/IOSAlarmScheduler.swift
import Foundation
import UserNotifications

struct IOSAlarmScheduler {

    private static func onceIdentifier(for baseId: String) -> String { "\(baseId)-once" }
    private static func threadKey(for baseId: String) -> String { "heyruffy.\(baseId)" }
    private static let dedupSlack: TimeInterval = 30

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

    // ② 예약 현황 덤프 (디버그용)
    private static func dumpPending(tag: String) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            print("PENDING[\(tag)] =", reqs.count)
            for r in reqs { print(" -", r.identifier) }
        }
    }

    // === 오늘만 ===
    static func scheduleOnce(at date: Date, id: String,
                             line1: String, line2: String, line3: String,
                             soundName: String) {

        // ③ 업서트 강화: 같은 접두사는 전부 제거 + once 식별자 제거
        cancel(byPrefix: id)
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [onceIdentifier(for: id)])

        let key = threadKey(for: id)
        let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: key)
        var comps = Calendar.current.dateComponents([.year,.month,.day,.hour,.minute], from: date)
        comps.second = 0
        let trig = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
        let req = UNNotificationRequest(identifier: onceIdentifier(for: id), content: content, trigger: trig)
        UNUserNotificationCenter.current().add(req) { e in
            print("once add:", e as Any, date)
            dumpPending(tag: "once")
        }
    }

    // === 매일 / N일마다 ===
    static func scheduleDaily(hour: Int, minute: Int, intervalDays: Int, startDate: String?,
                              baseId: String,
                              line1: String, line2: String, line3: String,
                              soundName: String) {
        let cal = Calendar.current
        let now = Date()
        var first: Date
        if let ymd = startDate, let d = dateFrom(ymd: ymd, hour: hour, minute: minute) {
            first = d
        } else {
            first = cal.date(bySettingHour: hour, minute: minute, second: 0, of: now) ?? now
        }

        if intervalDays == 1 {
            var comp = DateComponents(); comp.hour = hour; comp.minute = minute
            let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: threadKey(for: baseId))
            let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: true)
            let req = UNNotificationRequest(identifier: "\(baseId)-d1", content: content, trigger: trig)
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["\(baseId)-d1"])
            UNUserNotificationCenter.current().add(req) { e in
                print("daily(d1) add:", e as Any)
                dumpPending(tag: "daily")
            }
            return
        }

        while first <= now { first = cal.date(byAdding: .day, value: intervalDays, to: first)! }
        cancel(byPrefix: "\(baseId)-d\(intervalDays)-")
        let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: threadKey(for: baseId))
        var day = first
        for _ in stride(from: 0, through: 120, by: intervalDays) {
            var dc = cal.dateComponents([.year,.month,.day], from: day)
            dc.hour = hour; dc.minute = minute
            let trig = UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
            let req = UNNotificationRequest(identifier: "\(baseId)-d\(intervalDays)-\(Int(day.timeIntervalSince1970))", content: content, trigger: trig)
            UNUserNotificationCenter.current().add(req, withCompletionHandler: nil)
            day = cal.date(byAdding: .day, value: intervalDays, to: day)!
        }
        dumpPending(tag: "daily-dN")
    }

    // === 주간 ===
    static func scheduleWeekly(hour: Int, minute: Int, intervalWeeks: Int, weekdays: [Int],
                               baseId: String,
                               line1: String, line2: String, line3: String,
                               soundName: String) {
        let center = UNUserNotificationCenter.current()
        for w in weekdays {
            var comp = DateComponents(); comp.weekday = w; comp.hour = hour; comp.minute = minute
            let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: threadKey(for: baseId))

            if intervalWeeks == 1 {
                let trig = UNCalendarNotificationTrigger(dateMatching: comp, repeats: true)
                let req = UNNotificationRequest(identifier: "\(baseId)-w1-\(w)", content: content, trigger: trig)
                center.removePendingNotificationRequests(withIdentifiers: ["\(baseId)-w1-\(w)"])
                center.add(req) { _ in dumpPending(tag: "weekly-w1") }
            } else {
                var fire = Calendar.current.nextDate(after: Date(), matching: comp, matchingPolicy: .nextTimePreservingSmallerComponents)!
                cancel(byPrefix: "\(baseId)-w\(intervalWeeks)-\(w)")
                for _ in 0..<26 {
                    var dc = Calendar.current.dateComponents([.year,.month,.day], from: fire)
                    dc.hour = hour; dc.minute = minute
                    let trig = UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
                    let req = UNNotificationRequest(identifier: "\(baseId)-w\(intervalWeeks)-\(w)-\(Int(fire.timeIntervalSince1970))", content: content, trigger: trig)
                    center.add(req, withCompletionHandler: nil)
                    fire = Calendar.current.date(byAdding: .weekOfYear, value: intervalWeeks, to: fire)!
                }
                dumpPending(tag: "weekly-wN")
            }
        }
    }

    // === 월간 ===
    static func scheduleMonthly(day: Int, hour: Int, minute: Int, baseId: String,
                                line1: String, line2: String, line3: String,
                                soundName: String) {
        let cal = Calendar.current
        let center = UNUserNotificationCenter.current()
        for i in 0..<12 {
            if let target = cal.date(byAdding: .month, value: i, to: Date()) {
                var dc = cal.dateComponents([.year,.month], from: target)
                dc.day = min(day, lastDay(of: dc.year!, month: dc.month!))
                dc.hour = hour; dc.minute = minute
                let content = buildContent(line1: line1, line2: line2, line3: line3, soundName: soundName, threadKey: threadKey(for: baseId))
                let trig = UNCalendarNotificationTrigger(dateMatching: dc, repeats: false)
                let id = "\(baseId)-m-\(Int((Calendar.current.date(from: dc)?.timeIntervalSince1970) ?? 0))"
                let req = UNNotificationRequest(identifier: id, content: content, trigger: trig)
                center.add(req, withCompletionHandler: nil)
            }
        }
        dumpPending(tag: "monthly")
    }

    // === Helpers ===
    private static func buildContent(line1: String, line2: String, line3: String,
                                     soundName: String, threadKey: String) -> UNMutableNotificationContent {
        let c = UNMutableNotificationContent()
        c.title = line1         // 1줄: 앱 이름
        c.subtitle = line2      // 2줄: 다짐 이름
        c.body = line3          // 3줄: 기타 정보
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

