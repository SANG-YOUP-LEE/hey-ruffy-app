// ios/App/App/AppDelegate.swift
import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

      _ = RuffyTimePickerPlugin.self
      
      let center = UNUserNotificationCenter.current()
        center.delegate = self

        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            print("[iOS] Notification auth granted? \(granted)")
            center.getNotificationSettings { s in
                print("[iOS] Noti settings: auth=\(s.authorizationStatus.rawValue) alert=\(s.alertSetting.rawValue) sound=\(s.soundSetting.rawValue) badge=\(s.badgeSetting.rawValue) lock=\(s.lockScreenSetting.rawValue)")
            }
        }
        application.registerForRemoteNotifications()
        return true
    }

    // 포그라운드에서도 배너/사운드 표시
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

    // Capacitor URL handler
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

