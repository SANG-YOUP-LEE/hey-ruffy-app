import UIKit
import WebKit
import UserNotifications
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, WKScriptMessageHandler {

  // MARK: - Props
  var window: UIWindow?
  private let bridgeMessageName = "notify"
  private var didAttachHandler = false
  private weak var attachedWebView: WKWebView?
  private var attachAttempts = 0
  private let maxAttachAttempts = 20                // ~10s (0.5s * 20)
  private let soundName = "ruffysound001.wav"       // ensure in bundle

  // 모든 외부 id는 여기서 "routine-<id>" 로 통일
  private func routinePrefix(_ base: String) -> String { "routine-\(base)" }
  private func canonicalId(_ base: String) -> String { routinePrefix(base) }
  private func canonicalBaseId(from raw: String) -> String {
    // rt_abc-m01 / rt_abc-w5 / rt_abc-d2 / rt_abc-once / rt_abc-ping → routine-rt_abc
    let stripped = raw.replacingOccurrences(
      of: #"(-m\d{2}|-w[1-7]|-d\d+|-once|-ping)$"#,
      with: "",
      options: .regularExpression
    )
    return routinePrefix(stripped)
  }

  // 발사 직전 퍼지 가드(±120초)
  private let firingGuardWindow: TimeInterval = 120

  /// baseId("routine-...") 기준으로 지금으로부터 ±120초 안에 발사될 예약이 있으면 true
  private func shouldSkipPurge(baseId: String) -> Bool {
    let sema = DispatchSemaphore(value: 0)
    var skip = false
    UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
      let now = Date()
      for r in reqs where r.identifier.hasPrefix(baseId) {
        if let cal = r.trigger as? UNCalendarNotificationTrigger, let fire = cal.nextTriggerDate() {
          if abs(fire.timeIntervalSince(now)) <= self.firingGuardWindow { skip = true; break }
        } else if let ti = r.trigger as? UNTimeIntervalNotificationTrigger {
          if !ti.repeats && ti.timeInterval <= self.firingGuardWindow { skip = true; break }
        }
      }
      sema.signal()
    }
    _ = sema.wait(timeout: .now() + 0.5)
    return skip
  }

  // MARK: - App lifecycle
  func application(_ application: UIApplication,
                   didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    let center = UNUserNotificationCenter.current()
    center.delegate = self
    center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, err in
      print("notif permission:", granted, err as Any)
      self.dumpNotifSettings()
    }

    // WebView ↔︎ Native bridge attach (retry until ready)
    attachBridgeHandlerOnce()

    // 과거 엉킨 예약 잔재 1회 정리
    IOSAlarmScheduler.migrateAndCleanLegacyOnce(legacyPrefixes: [
      "inline", "routine-inline", "rt_", "alarm", "routine-alarm"
    ])

    return true
  }

  func applicationDidBecomeActive(_ application: UIApplication) {
    attachBridgeHandlerOnce()
    UNUserNotificationCenter.current().delegate = self
    dumpNotifSettings()
  }

  // MARK: - Bridge attach (retry until ready, attach 1회 보장)
  private func attachBridgeHandlerOnce() {
    if didAttachHandler, let webView = currentWebView(), attachedWebView === webView {
      return
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
      guard let self = self else { return }

      guard let webView = self.currentWebView() else {
        self.attachAttempts += 1
        if self.attachAttempts <= self.maxAttachAttempts {
          print("Bridge/WebView not ready yet (\(self.attachAttempts)) → retry")
          self.attachBridgeHandlerOnce()
        } else {
          print("Bridge/WebView attach GIVE UP")
        }
        return
      }

      if self.didAttachHandler, self.attachedWebView === webView { return }

      let ucc = webView.configuration.userContentController
      ucc.removeScriptMessageHandler(forName: self.bridgeMessageName)
      ucc.add(self, name: self.bridgeMessageName)
      self.didAttachHandler = true
      self.attachedWebView = webView
      print("WKScriptMessageHandler **ATTACHED** for \(self.bridgeMessageName)")
    }
  }

  private func currentWebView() -> WKWebView? {
    guard
      let bridgeVC = self.window?.rootViewController as? CAPBridgeViewController,
      let webView = bridgeVC.bridge?.webView
    else { return nil }
    return webView
  }

  // MARK: - Small helpers (native-only)
  private func purge(prefix: String, _ done: (() -> Void)? = nil) {
    UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
      let ids = reqs.map { $0.identifier }.filter { $0.hasPrefix(prefix) }
      UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
      UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ids)
      done?()
    }
  }

  // ✅ 지난(Delivered) 기록 정리 – 같은 루틴 prefix만
  private func purgeDelivered(prefix: String, keepLatest: Bool = true) {
    UNUserNotificationCenter.current().getDeliveredNotifications { notes in
      let same = notes.filter {
        $0.request.identifier.hasPrefix(prefix) ||
        $0.request.content.threadIdentifier.contains(prefix)   // ← threadKey에도 포함되면 매칭
      }
      guard !same.isEmpty else { return }
      let sorted = same.sorted { a, b in a.date < b.date }
      var ids = sorted.map { $0.request.identifier }
      if keepLatest, let last = ids.last { ids.removeAll { $0 == last } }
      if !ids.isEmpty {
        UNUserNotificationCenter.current()
          .removeDeliveredNotifications(withIdentifiers: ids)
      }
    }
  }

  // ✅ thread + link 지원
  private func scheduleOnce(
    id: String,
    title: String,
    body: String?,
    date: Date,
    thread: String? = nil,
    link: String? = nil
  ) {
    let comps = Calendar.current.dateComponents([.year,.month,.day,.hour,.minute,.second], from: date)
    let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
    let c = UNMutableNotificationContent()
    c.title = title
    if let body = body, !body.isEmpty { c.body = body }
    if #available(iOS 15.0, *) { c.interruptionLevel = .timeSensitive }
    c.sound = UNNotificationSound(named: UNNotificationSoundName(soundName))
    if let thread = thread { c.threadIdentifier = thread }   // 그룹화
    if let link = link { c.userInfo["link"] = link }         // 딥링크

    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: c, trigger: trigger))
  }

  // MARK: - WKScriptMessageHandler
  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    guard message.name == bridgeMessageName else { return }

    if let dict = message.body as? [String: Any] {
      handleBridge(dict)
    } else if let arr = message.body as? [[String: Any]] {
      for d in arr { handleBridge(d) }
    } else {
      print("BRIDGE invalid payload:", message.body)
    }
  }

  // MARK: - Bridge payload helpers
  private func readHourMinute(_ dict: [String: Any]) -> (hour: Int, minute: Int) {
    if let h = dict["hour"] as? Int, let m = dict["minute"] as? Int { return (h, m) }
    if let t = dict["time"] as? [String: Any],
       let h = t["hour"] as? Int, let m = t["minute"] as? Int { return (h, m) }
    if let a = dict["alarm"] as? [String: Any],
       let h = a["hour"] as? Int, let m = a["minute"] as? Int { return (h, m) }
    return (9, 0)
  }

  private func normalizeWeekdays(_ raw: Any?) -> [Int] {
    // iOS: 1=Sun ... 7=Sat
    let mapICS: [String:Int] = ["SU":1,"MO":2,"TU":3,"WE":4,"TH":5,"FR":6,"SA":7]
    let mapKR:  [String:Int] = ["일":1,"월":2,"화":3,"수":4,"목":5,"금":6,"토":7]

    if let ints = raw as? [Int] {
      if ints.allSatisfy({ (0...6).contains($0) }) {
        return Array(Set(ints.map { $0 + 1 })).sorted()
      }
      return Array(Set(ints.compactMap { (1...7).contains($0) ? $0 : nil })).sorted()
    }

    if let strs = raw as? [String] {
      let mapped = strs.compactMap { s -> Int? in
        let u = s.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if let v = mapICS[u] { return v }
        if let v = mapKR[String(s.prefix(1))] { return v }
        return Int(u)
      }
      return Array(Set(mapped.compactMap { (1...7).contains($0) ? $0 : nil })).sorted()
    }

    if let one = raw as? String {
      let u = one.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
      if let v = mapICS[u] { return [v] }
      if let v = mapKR[String(one.prefix(1))] { return [v] }
      if let v = Int(u), (1...7).contains(v) { return [v] }
    }

    return [1,2,3,4,5,6,7]
  }

  private func readIntervalWeeks(_ dict: [String: Any]) -> Int {
    let v = (dict["intervalWeeks"] as? Int)
    ?? (dict["weeksInterval"] as? Int)
    ?? (dict["everyWeeks"] as? Int)
    ?? 1
    return max(1, v)
  }

  private func readIntervalDays(_ dict: [String: Any]) -> Int {
    let v = (dict["interval"] as? Int)
    ?? (dict["intervalDays"] as? Int)
    ?? 1
    return max(1, v)
  }

  // MARK: - Bridge entry
  private func handleBridge(_ dict: [String: Any]) {
    let action = (dict["action"] as? String) ?? ""
    print("BRIDGE recv:", action, dict)

    // ✅ 새 프로토콜: JS가 확정된 epoch(초) 배열을 전달
    if action == "setScheduleForRoutine",
       let rid   = dict["routineId"] as? String,
       let mode  = dict["mode"] as? String,
       let title = dict["title"] as? String,
       let epochs = dict["fireTimesEpoch"] as? [Double] {

      let body = (dict["body"] as? String) ?? ""
      let prefix = routinePrefix(rid)
      let linkStr = dict["link"] as? String            // ✅ 딥링크 수신

      // 같은 루틴 prefix만 pending + delivered 정리
      if shouldSkipPurge(baseId: prefix) {
        print("setScheduleForRoutine purge SKIPPED (within firing window) for \(prefix)")
      } else {
        purge(prefix: prefix)
        purgeDelivered(prefix: prefix)                 // ✅ 지난 기록 정리
      }

      for (i, ep) in epochs.enumerated() {
        // JS가 "초"로 보냄!
        var when = Date(timeIntervalSince1970: ep)
        if when.timeIntervalSinceNow < 3 { when = Date().addingTimeInterval(3) } // 안전 +3s

        let id: String
        switch mode {
          case "once":    id = prefix                                // 단발은 항상 하나
          case "daily":   id = "\(prefix)-d-\(i)"
          case "weekly":  id = "\(prefix)-w-\(i)"
          case "monthly": id = "\(prefix)-m-\(i)"
          default:        id = "\(prefix)-x-\(i)"
        }
        // 그룹화(thread=prefix) + 딥링크(link)
        scheduleOnce(id: id, title: title, body: body, date: when, thread: prefix, link: linkStr) // ✅
      }
      return
    }

    // ✅ 새 프로토콜: 루틴 전체 제거
    if action == "clearScheduleForRoutine",
       let rid = dict["routineId"] as? String {
      purge(prefix: routinePrefix(rid))
      return
    }

    // ✅ 레거시 호환
    switch action {

    case "cancel":
      if let raw = dict["id"] as? String {
        let base = canonicalBaseId(from: raw) // "routine-<rt_...>"
        if shouldSkipPurge(baseId: base) {
          print("cancel SKIPPED (within firing window) for \(base)")
        } else {
          IOSAlarmScheduler.purgeAllForBase(baseId: base)
        }
      }

    case "schedule":
      let repeatMode = (dict["repeatMode"] as? String) ?? "once"
      let baseId = canonicalId((dict["id"] as? String) ?? "alarm")

      // 제목/부제: 다짐 제목이 크게 보이도록
      let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
      let titleText = (dict["title"] as? String) ?? (dict["name"] as? String) ?? "다짐"
      let subtitleText = (dict["subtitle"] as? String) ?? appName
      let bodyText = ""
      let linkStr = dict["link"] as? String            // ✅ 딥링크 수신

      if shouldSkipPurge(baseId: baseId) {
        print("purge SKIPPED (within firing window) for \(baseId)")
      } else {
        IOSAlarmScheduler.purgeAllForBase(baseId: baseId)
        purgeDelivered(prefix: baseId)                 // ✅ 지난 기록 정리
      }

      switch repeatMode {
      case "once":
        // ⬇︎ **중요**: JS가 초(second)로 보냄 → 나누지 말고 그대로 사용
        let tsVal = (dict["timestamp"] as? NSNumber)?.doubleValue ?? -1
        var fire: Date
        if tsVal.isFinite && !tsVal.isNaN && tsVal > 0 {
          fire = Date(timeIntervalSince1970: tsVal)
        } else {
          let hm = readHourMinute(dict)
          var comp = Calendar.current.dateComponents([.year,.month,.day], from: Date())
          comp.hour = hm.hour; comp.minute = hm.minute; comp.second = 0
          fire = Calendar.current.date(from: comp) ?? Date().addingTimeInterval(60)
          if fire <= Date() { fire = Calendar.current.date(byAdding: .day, value: 1, to: fire)! }
          print("schedule(once): fallback @ \(fire)")
        }
        // 그룹화(thread=baseId) + 딥링크(link) 전달
        scheduleOnce(id: baseId, title: titleText, body: bodyText, date: fire, thread: baseId, link: linkStr) // ✅

      case "daily":
        let hm = readHourMinute(dict)
        let interval = readIntervalDays(dict)
        let startDate = dict["startDate"] as? String
        IOSAlarmScheduler.scheduleDaily(
          hour: hm.hour, minute: hm.minute,
          intervalDays: interval, startDate: startDate,
          baseId: baseId,
          line1: titleText,
          line2: subtitleText,
          line3: bodyText,
          soundName: soundName,
          link: linkStr                                       // ✅ 전달
        )

      case "weekly":
        let hm = readHourMinute(dict)
        let weeks = readIntervalWeeks(dict)
        let wdays = normalizeWeekdays(
          dict["weekdays"] ?? dict["weekday"] ?? (dict["alarm"] as? [String:Any])?["weekdays"]
        )
        IOSAlarmScheduler.scheduleWeekly(
          hour: hm.hour, minute: hm.minute,
          intervalWeeks: weeks, weekdays: wdays,
          baseId: baseId,
          line1: titleText,
          line2: subtitleText,
          line3: bodyText,
          soundName: soundName,
          link: linkStr                                       // ✅ 전달
        )

      case "monthly", "monthly-date":
        let hm = readHourMinute(dict)
        let day = (dict["day"] as? Int) ?? IOSAlarmScheduler.dayFrom(dict: dict)
        IOSAlarmScheduler.scheduleMonthly(
          day: day, hour: hm.hour, minute: hm.minute,
          baseId: baseId,
          line1: titleText,
          line2: subtitleText,
          line3: bodyText,
          soundName: soundName,
          link: linkStr                                       // ✅ 전달
        )

      default:
        print("Unknown repeatMode:", repeatMode)
      }

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
    let r = notification.request
    print("WILL_PRESENT:", r.identifier, "| title:", r.content.title, "| subtitle:", r.content.subtitle)
    completionHandler([.banner, .list, .sound])
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    let r = response.notification.request

    // ✅ 알림 탭 시, 딥링크를 Capacitor로 전달
    if let linkStr = r.content.userInfo["link"] as? String,
       let url = URL(string: linkStr),
       let bridgeVC = self.window?.rootViewController as? CAPBridgeViewController,
       let bridge = bridgeVC.bridge {
      bridge.handleOpenUrl(url, sourceApplication: nil, annotation: [:])
    }

    print("DELIVERED:", r.identifier, "| title:", r.content.title, "| subtitle:", r.content.subtitle)
    completionHandler()
  }

  // MARK: - Debug utils
  private func dumpNotifSettings() {
    UNUserNotificationCenter.current().getNotificationSettings { s in
      if #available(iOS 15.0, *) {
        print("""
              SETTINGS: alert=\(s.alertSetting.rawValue) banner=\(s.alertStyle.rawValue) sound=\(s.soundSetting.rawValue) \
              lock=\(s.lockScreenSetting.rawValue) badge=\(s.badgeSetting.rawValue) \
              timeSensitive=\(s.timeSensitiveSetting.rawValue) scheduledSummary=\(s.scheduledDeliverySetting.rawValue)
              """)
      } else {
        print("""
              SETTINGS: alert=\(s.alertSetting.rawValue) banner=\(s.alertStyle.rawValue) sound=\(s.soundSetting.rawValue) \
              lock=\(s.lockScreenSetting.rawValue) badge=\(s.badgeSetting.rawValue)
              """)
      }
    }
  }
}

