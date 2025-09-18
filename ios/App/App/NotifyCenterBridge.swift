import Foundation
import Capacitor
import UserNotifications

@objc(NotifyCenterBridge)
public class NotifyCenterBridge: CAPPlugin {
  @objc func purgeAllForBase(_ call: CAPPluginCall) {
    let base = call.getString("base") ?? ""
    UNUserNotificationCenter.current().getPendingNotificationRequests { reqs in
      let p = reqs.filter { $0.identifier.hasPrefix(base) }.map { $0.identifier }
      UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: p)
      UNUserNotificationCenter.current().getDeliveredNotifications { notis in
        let d = notis.filter { $0.request.identifier.hasPrefix(base) }.map { $0.request.identifier }
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: d)
        call.resolve(["removedPending": p.count, "removedDelivered": d.count])
      }
    }
  }
}
