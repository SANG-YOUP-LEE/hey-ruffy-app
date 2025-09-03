// File: ios/App/App/AppDelegate.swift
import UIKit
import Capacitor
import WebKit
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, WKScriptMessageHandler {
  
  var window: UIWindow?
  private let bridgeMessageName = "notify"       // JS: window.webkit.messageHandlers.notify.postMessage(...)
  private var didAttachHandler = false
  private let soundName = "ruffysound001.wav"    // 번들에 없으면 기본음으로 대체됨
  
  func application(_ application: UIApplication,
                   didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    
    let center = UNUserNotificationCenter.current()
    center.delegate = self
    center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, err in
      print("notif permission:", granted, err as Any)
    }
    
    attachBridgeHandlerOnce()
    
    // ① 최초 1회: 과거 예약/전달 알림 전면 청소
    cleanupLegacyNotificationsOnce()
    
    return true
  }
  
  // MARK: - Legacy cleanup (run once)
  private func cleanupLegacyNotificationsOnce() {
    let key = "didCleanupLegacyNotifs_v1"
    let ud = UserDefaults.standard
    guard !ud.bool(forKey: key) else { return } // 최초 1회만 실행
    ud.set(true, forKey: key)
    
    let c = UNUserNotificationCenter.current()
    c.removeAllDeliveredNotifications()
    c.getPendingNotificationRequests { reqs in
      let allIds = reqs.map { $0.identifier }
      c.removePendingNotificationRequests(withIdentifiers: allIds)
      print("Legacy cleanup: removed pending =", allIds.count)
    }
  }
  
  // MARK: - Bridge attach (1회만, 준비될 때까지 재시도)
  private func attachBridgeHandlerOnce() {
    var attempts = 0
    func tryAttach() {
      if self.didAttachHandler { return }
      attempts += 1
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
        guard let self = self else { return }
        guard let window = self.window,
              let root = window.rootViewController as? CAPBridgeViewController,
              let webView = root.bridge?.webView else {
          if attempts < 10 { tryAttach() } else { print("Bridge/WebView not ready - give up") }
          return
        }
        let ucc = webView.configuration.userContentController
        ucc.removeScriptMessageHandler(forName: self.bridgeMessageName)
        ucc.add(self, name: self.bridgeMessageName)
        self.didAttachHandler = true
        print("WKMessageHandler attached for \(self.bridgeMessageName)")
      }
    }
    tryAttach()
  }
  
  // MARK: - WKScriptMessageHandler
  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    guard message.name == bridgeMessageName else { return }
    guard let dict = message.body as? [String: Any],
          let action = dict["action"] as? String else {
      print("Invalid payload:", message.body); return
    }
    
    // ② BRIDGE 수신 로그
    print("BRIDGE recv:", action, dict)
    
    let baseId = (dict["id"] as? String) ?? "alarm"
    let appName = Bundle.main.infoDictionary?["CFBundleDisplayName"] as? String ?? "HeyRuffy"
    let routineName = (dict["title"] as? String) ?? "다짐"
    let extraInfo  = (dict["subtitle"] as? String) ?? ""
    
    switch action {
    case "cancel":
      IOSAlarmScheduler.cancel(byPrefix: baseId)
      
    case "scheduleOnce":
      let ts = (dict["timestamp"] as? Double) ?? 0
      let fire = Date(timeIntervalSince1970: ts/1000.0)
      IOSAlarmScheduler.scheduleOnce(
        at: fire, id: baseId,
        line1: appName, line2: routineName, line3: extraInfo,
        soundName: soundName
      )
      
    case "scheduleDaily":
      let hour = dict["hour"] as? Int ?? 9
      let minute = dict["minute"] as? Int ?? 0
      let interval = max(1, dict["interval"] as? Int ?? 1)
      let startDateStr = dict["startDate"] as? String
      IOSAlarmScheduler.scheduleDaily(
        hour: hour, minute: minute, intervalDays: interval, startDate: startDateStr, baseId: baseId,
        line1: appName, line2: routineName, line3: extraInfo,
        soundName: soundName
      )
      
    case "scheduleWeekly":
      let hour = dict["hour"] as? Int ?? 9
      let minute = dict["minute"] as? Int ?? 0
      let iosWeekdays = (dict["weekdays"] as? [Int] ?? []).map { min(max($0,1),7) }
      let intervalWeeks = max(1, dict["intervalWeeks"] as? Int ?? 1)
      IOSAlarmScheduler.scheduleWeekly(
        hour: hour, minute: minute, intervalWeeks: intervalWeeks, weekdays: iosWeekdays, baseId: baseId,
        line1: appName, line2: routineName, line3: extraInfo,
        soundName: soundName
      )
      
    case "scheduleMonthly":
      let day = dict["day"] as? Int ?? IOSAlarmScheduler.dayFrom(dict: dict)
      let hour = dict["hour"] as? Int ?? 9
      let minute = dict["minute"] as? Int ?? 0
      IOSAlarmScheduler.scheduleMonthly(
        day: day, hour: hour, minute: minute, baseId: baseId,
        line1: appName, line2: routineName, line3: extraInfo,
        soundName: soundName
      )
      
    default:
      print("Unknown action:", action)
    }
  }
  
  // MARK: - UNUserNotificationCenterDelegate
  
  // 앱이 포그라운드일 때도 배너/사운드/목록 표시
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.banner, .list, .sound])
  }
  
  // 실제 알림이 도착했을 때 (사용자가 탭하거나 자동 표시될 때 호출됨)
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    let r = response.notification.request
    print("DELIVERED:", r.identifier,
          "| title:", r.content.title,
          "| subtitle:", r.content.subtitle)
    completionHandler()
  }
}
