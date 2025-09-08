import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        let center = UNUserNotificationCenter.current()
        center.delegate = self

        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            print("[iOS] Notification auth granted? \(granted)")
            center.getNotificationSettings { s in
                print("[iOS] Noti settings: auth=\(s.authorizationStatus.rawValue) alert=\(s.alertSetting.rawValue) sound=\(s.soundSetting.rawValue) badge=\(s.badgeSetting.rawValue) lock=\(s.lockScreenSetting.rawValue)")
            }
        }
        application.registerForRemoteNotifications()

        // ✅ 앱 시작 5초 뒤 무조건 울리는 로컬 알림 (JS 경로 안 탐)
        smokeTestLocalAfter(seconds: 5)

        // ✅ 현재 대기중 알림도 바로 덤프해서 확인
        dumpPending(tag: "boot")

        return true
    }

    // MARK: - Smoke test (native only)
    private func smokeTestLocalAfter(seconds: Int) {
        let content = UNMutableNotificationContent()
        content.title = "LOCAL TEST"
        content.body  = "fires in \(seconds)s"
        content.sound = UNNotificationSound(named: UNNotificationSoundName("ruffysound001.wav"))

        let trig = UNTimeIntervalNotificationTrigger(timeInterval: TimeInterval(max(1, seconds)), repeats: false)
        let id = "smoke__\(UUID().uuidString)"
        let req = UNNotificationRequest(identifier: id, content: content, trigger: trig)

        UNUserNotificationCenter.current().add(req) { err in
            if let err = err {
                print("[iOS] smoke add error -> \(err)")
            } else {
                print("[iOS] smoke scheduled id=\(id) in \(seconds)s")
            }
        }
    }

    private func dumpPending(tag: String) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
            print("[iOS] dumpPending(\(tag)) count=\(reqs.count)")
            for r in reqs {
                print(" - id=\(r.identifier) trigger=\(String(describing: r.trigger))")
            }
        }
    }

    // MARK: - Foreground presentation (배너/사운드 강제 표시)
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("[iOS] willPresent fired -> show banner+sound")
        completionHandler([.banner, .sound, .list, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        print("[iOS] didReceive response id=\(response.notification.request.identifier)")
        completionHandler()
    }

    // 기본 Capacitor URL handler 유지
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

