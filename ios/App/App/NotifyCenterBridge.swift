import Foundation
import Capacitor
import UserNotifications

@objc(NotifyCenterBridge)
public class NotifyCenterBridge: CAPPlugin {

  @objc func setEditing(_ call: CAPPluginCall) {
    let editing = call.getBool("editing") ?? false
    let ud = UserDefaults.standard
    ud.set(editing, forKey: "ru_editingRoutine")
    if editing { ud.set(Date().timeIntervalSince1970, forKey: "ru_editingSince") }
    call.resolve()
  }

  @objc func setActiveGeneration(_ call: CAPPluginCall) {
    let baseId = call.getString("baseId") ?? ""
    let gen = call.getString("gen") ?? ""
    if baseId.isEmpty || gen.isEmpty { call.resolve(); return }
    UserDefaults.standard.set(gen, forKey: "ru_gen_\(baseId)")
    call.resolve()
  }

  @objc func purgeBase(_ call: CAPPluginCall) {
    let baseId = call.getString("baseId") ?? ""
    let gen = call.getString("gen") ?? ""     // 선택적 필터
    let dryRun = call.getBool("dryRun") ?? false
    let force = call.getBool("force") ?? false
    let maxDelete = call.getInt("maxDelete") ?? 4
    if baseId.isEmpty { call.resolve(); return }

    let center = UNUserNotificationCenter.current()
    func matches(_ r: UNNotificationRequest) -> Bool {
      // baseId 3중 기준
      let baseOK = r.identifier.hasPrefix(baseId)
        || (r.content.userInfo["baseId"] as? String) == baseId
        || r.content.threadIdentifier == baseId
      if !baseOK { return false }
      // gen 지정 시 gen까지 일치해야 함
      if !gen.isEmpty {
        if let g = r.content.userInfo["gen"] as? String, g == gen { return true }
        if r.identifier.contains("__g:\(gen)__") { return true }
        return false
      }
      return true
    }

    var pendingIds: [String] = []
    var deliveredIds: [String] = []

    let group = DispatchGroup()
    group.enter()
    center.getPendingNotificationRequests { reqs in
      pendingIds = reqs.filter(matches).map { $0.identifier }
      group.leave()
    }
    group.enter()
    center.getDeliveredNotifications { notes in
      deliveredIds = notes.map { $0.request }.filter(matches).map { $0.identifier }
      group.leave()
    }
    group.notify(queue: .main) {
      let total = pendingIds.count + deliveredIds.count
      if dryRun || (!force && total > maxDelete) {
        self.notifyListeners("purgeBaseDryRun", data: [
          "baseId": baseId, "gen": gen,
          "pending": pendingIds, "delivered": deliveredIds,
          "count": total, "aborted": dryRun || (!force && total > maxDelete)
        ])
        call.resolve()
        return
      }
      if !pendingIds.isEmpty { center.removePendingNotificationRequests(withIdentifiers: pendingIds) }
      if !deliveredIds.isEmpty { center.removeDeliveredNotifications(withIdentifiers: deliveredIds) }
      self.notifyListeners("purgeBase", data: [
        "baseId": baseId, "gen": gen,
        "removedPending": pendingIds.count, "removedDelivered": deliveredIds.count
      ])
      call.resolve()
    }
  }

  @objc func purgeAllForBase(_ call: CAPPluginCall) { purgeBase(call) }
}

