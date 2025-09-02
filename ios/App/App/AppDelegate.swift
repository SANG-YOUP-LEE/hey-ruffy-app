import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

  var window: UIWindow?

  // 앱 시작 시 권한 요청 + delegate 지정
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
      print("🔔 notification permission:", granted)
    }
    return true
  }

  // 포어그라운드에서도 배너/소리/배지 표시
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .sound, .badge])
  }

  // Capacitor URL/Universal Link 핸들러
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
  }

  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }

  // MARK: - 로컬 알림 스케줄러

  /// 특정 시각(년/월/일/시/분/초)에 한 번 울리는 알림
  func scheduleLocalNotification(
    id: String,
    title: String,
    body: String,
    date: Date,
    soundFileName: String = "ruffysound001.wav"
  ) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.body  = body
    content.sound = UNNotificationSound(named: UNNotificationSoundName(soundFileName))

    var cal = Calendar.current
    cal.timeZone = .current
    let comps = cal.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)

    let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
    let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
    UNUserNotificationCenter.current().add(request) { err in
      print(err == nil ? "🔔 \(id) 예약 완료 @ \(comps)" : "🔔 예약 실패: \(err!)")
    }
  }

  /// 매일 같은 시각에 울리는 알림
  func scheduleDailyNotification(
    id: String,
    title: String,
    body: String,
    hour: Int,
    minute: Int,
    soundFileName: String = "ruffysound001.wav"
  ) {
    var comps = DateComponents()
    comps.hour = hour
    comps.minute = minute

    let content = UNMutableNotificationContent()
    content.title = title
    content.body  = body
    content.sound = UNNotificationSound(named: UNNotificationSoundName(soundFileName))

    let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
    let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
    UNUserNotificationCenter.current().add(request) { err in
      print(err == nil ? "🔁 Daily \(id) @ \(hour):\(minute) 예약" : "🔁 Daily 예약 실패: \(err!)")
    }
  }

  /// 매주 요일+시각(1=일, 2=월 … 7=토)
  func scheduleWeeklyNotification(
    id: String,
    title: String,
    body: String,
    weekday: Int,
    hour: Int,
    minute: Int,
    soundFileName: String = "ruffysound001.wav"
  ) {
    var comps = DateComponents()
    comps.weekday = weekday
    comps.hour = hour
    comps.minute = minute

    let content = UNMutableNotificationContent()
    content.title = title
    content.body  = body
    content.sound = UNNotificationSound(named: UNNotificationSoundName(soundFileName))

    let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
    let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
    UNUserNotificationCenter.current().add(request) { err in
      print(err == nil ? "🔁 Weekly \(id) @ weekday \(weekday) \(hour):\(minute) 예약" : "🔁 Weekly 예약 실패: \(err!)")
    }
  }

  // 취소
  func cancelNotification(id: String) {
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id])
    print("🗑️ \(id) 취소")
  }

  func cancelAllNotifications() {
    UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    print("🗑️ 모든 예약 취소")
  }
}

