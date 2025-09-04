// File: ios/App/App/AppDelegate.swift

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
  private var attachAttempts = 0
  private let maxAttachAttempts = 20                 // ~10s (0.5s * 20)
  private let soundName = "ruffysound001.wav"        // ensure in bundle
  
  // 모든 외부 id는 여기서 "routine-<id>" 로 통일
  private func canonicalId(_ base: String) -> String { "routine-\(base)" }
  
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
    // 다른 SDK가 delegate 바꿔치기할 수 있으니 항상 다시 지정
    UNUserNotificationCenter.current().delegate = self
    dumpNotifSettings()
  }
  
  // MARK: - Bridge attach (retry until ready)
  private func attachBridgeHandlerOnce() {
    if didAttachHandler { return }
    
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
      guard let self = self else { return }
      
      guard
        let bridgeVC = self.window?.rootViewController as? CAPBridgeViewController,
        let webView = bridgeVC.bridge?.webView
      else {
        self.attachAttempts += 1
        if self.attachAttempts <= self.maxAttachAttempts {
          print("Bridge/WebView not ready yet (\(self.attachAttempts)) → retry")
          self.attachBridgeHandlerOnce()
        } else {
          print("Bridge/WebView attach GIVE UP")
        }
        return
      }
      
      let ucc = webView.configuration.userContentController
      ucc.removeScriptMessageHandler(forName: self.bridgeMessageName)
      ucc.add(self, name: self.bridgeMessageName)
      self.didAttachHandler = true
      print("WKScriptMessageHandler **ATTACHED** for \(self.bridgeMessageName)")
    }
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
    
    switch action {
      
    case "cancel":
      if let raw = dict["id"] as? String {
        let base = canonicalId(raw)
        IOSAlarmScheduler.purgeAllForBase(baseId: base)
      }
      
    case "schedule":
      let repeatMode = (dict["repeatMode"] as? String) ?? "once"
      let baseId = canonicalId((dict["id"] as? String) ?? "alarm")
      let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
      let line2 = (dict["title"] as? String) ?? (dict["name"] as? String) ?? "다짐"
      let line3 = (dict["subtitle"] as? String) ?? ""
      
      // ⬇️ 여기 기존 코드
          // IOSAlarmScheduler.purgeAllForBase(baseId: baseId)

          // ⬇️ 이렇게 교체
          if IOSAlarmScheduler.shouldSkipPurge(baseId: baseId) {
              print("purge SKIPPED (within firing window) for", baseId)
          } else {
              IOSAlarmScheduler.purgeAllForBase(baseId: baseId)
          }
      
      switch repeatMode {
      case "once":
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
        IOSAlarmScheduler.scheduleOnce(at: fire,
                                       id: baseId,
                                       line1: appName, line2: line2, line3: line3,
                                       soundName: soundName)
        
      case "daily":
        let hm = readHourMinute(dict)
        let interval = readIntervalDays(dict)
        let startDate = dict["startDate"] as? String
        IOSAlarmScheduler.scheduleDaily(hour: hm.hour, minute: hm.minute,
                                        intervalDays: interval, startDate: startDate,
                                        baseId: baseId,
                                        line1: appName, line2: line2, line3: line3,
                                        soundName: soundName)
        
      case "weekly":
        let hm = readHourMinute(dict)
        let weeks = readIntervalWeeks(dict)
        let wdays = normalizeWeekdays(
          dict["weekdays"] ?? dict["weekday"] ?? (dict["alarm"] as? [String:Any])?["weekdays"]
        )
        IOSAlarmScheduler.scheduleWeekly(hour: hm.hour, minute: hm.minute,
                                         intervalWeeks: weeks, weekdays: wdays,
                                         baseId: baseId,
                                         line1: appName, line2: line2, line3: line3,
                                         soundName: soundName)
        
      case "monthly", "monthly-date":
        let hm = readHourMinute(dict)
        let day = (dict["day"] as? Int) ?? IOSAlarmScheduler.dayFrom(dict: dict)
        IOSAlarmScheduler.scheduleMonthly(day: day, hour: hm.hour, minute: hm.minute,
                                          baseId: baseId,
                                          line1: appName, line2: line2, line3: line3,
                                          soundName: soundName)
        
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
