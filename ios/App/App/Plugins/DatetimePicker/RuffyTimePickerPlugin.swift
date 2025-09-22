// ios/App/App/RuffyTimePickerPlugin.swift
import Foundation
import Capacitor
import UIKit

@objc(RuffyTimePickerPlugin)
public class RuffyTimePickerPlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "RuffyTimePickerPlugin"
  public let jsName = "RuffyTimePicker"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise)
  ]

  @objc public func present(_ call: CAPPluginCall) {
    _ = call.getString("mode")
    let value = call.getString("value")
    let format = call.getString("format") ?? "yyyy-MM-dd'T'HH:mm:ss"
    let cancelTitle = call.getString("cancelButtonText") ?? "취소"
    let doneTitle = call.getString("doneButtonText") ?? "완료"

    let initialDate: Date? = {
      guard let s = value, !s.isEmpty else { return nil }
      let f = DateFormatter()
      f.calendar = .current; f.locale = .current; f.timeZone = .current
      f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
      if let d = f.date(from: s) {
        var comp = Calendar.current.dateComponents([.year,.month,.day], from: Date())
        comp.hour = Calendar.current.component(.hour, from: d)
        comp.minute = Calendar.current.component(.minute, from: d)
        comp.second = 0
        return Calendar.current.date(from: comp)
      }
      return nil
    }()

    DispatchQueue.main.async { [weak self] in
      guard let self = self, let presenter = self.bridge?.viewController else { return }
      presenter.view.endEditing(true)

      let vc = RuffyPickerViewController(
        initialDate: initialDate,
        returnFormat: format,
        cancelTitle: cancelTitle,
        doneTitle: doneTitle
      )
      vc.modalPresentationStyle = .overFullScreen

      vc.onCancel = { [weak self] in
        self?.bridge?.viewController?.dismiss(animated: false)
        call.reject("canceled", "canceled", nil, nil)
      }
      vc.onDone = { [weak self] iso in
        self?.bridge?.viewController?.dismiss(animated: false)
        call.resolve(["value": iso])
      }

      presenter.present(vc, animated: false)
    }
  }
}

final class RuffyPickerViewController: UIViewController {
  var onCancel: (() -> Void)?
  var onDone: ((String) -> Void)?

  private let initialDate: Date?
  private let returnFormat: String
  private let cancelTitle: String
  private let doneTitle: String

  private let dim = UIControl()
  private let sheet = UIView()
  private let bar = UIStackView()
  private let picker = UIDatePicker()

  override var canBecomeFirstResponder: Bool { false }

  init(initialDate: Date?, returnFormat: String, cancelTitle: String, doneTitle: String) {
    self.initialDate = initialDate
    self.returnFormat = returnFormat
    self.cancelTitle = cancelTitle
    self.doneTitle = doneTitle
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .clear

    dim.backgroundColor = .black
    dim.frame = view.bounds
    dim.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    dim.alpha = 0
    dim.addTarget(self, action: #selector(tapCancel), for: .touchUpInside)
    view.addSubview(dim)

    sheet.backgroundColor = .systemBlue
    sheet.layer.cornerRadius = 50
    sheet.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
    sheet.layer.masksToBounds = true
    view.addSubview(sheet)

    bar.axis = .horizontal
    bar.alignment = .fill
    bar.distribution = .fillEqually
    sheet.addSubview(bar)

    let cancel = UIButton(type: .system)
    cancel.setTitle(cancelTitle, for: .normal)
    cancel.tintColor = .white
    cancel.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
    cancel.addTarget(self, action: #selector(tapCancel), for: .touchUpInside)

    let done = UIButton(type: .system)
    done.setTitle(doneTitle, for: .normal)
    done.tintColor = .white
    done.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
    done.addTarget(self, action: #selector(tapDone), for: .touchUpInside)

    bar.addArrangedSubview(cancel)
    bar.addArrangedSubview(done)

    picker.datePickerMode = .time
    picker.preferredDatePickerStyle = .wheels
    picker.locale = Locale(identifier: "ko_KR")
    picker.backgroundColor = .systemBlue
    if let d = initialDate { picker.date = d }
    else {
      var c = DateComponents(); c.hour = 10; c.minute = 0
      if let d = Calendar.current.date(from: c) { picker.date = d }
    }

    if #available(iOS 13.0, *) {
      overrideUserInterfaceStyle = .dark
      sheet.overrideUserInterfaceStyle = .dark
      picker.overrideUserInterfaceStyle = .dark
    }
    picker.setValue(UIColor.white, forKey: "textColor")
    picker.addTarget(self, action: #selector(noKeypad(_:)), for: .editingDidBegin)

    sheet.addSubview(picker)
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    UIView.animate(withDuration: 0.3) { self.dim.alpha = 0.5 }
  }

  @objc private func noKeypad(_ sender: UIDatePicker) { sender.resignFirstResponder() }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    let totalH: CGFloat = 380
    let barH: CGFloat = 50

    sheet.frame = CGRect(x: 0, y: view.bounds.height - totalH, width: view.bounds.width, height: totalH)
    bar.frame = CGRect(x: 0, y: 0, width: sheet.bounds.width, height: barH)
    picker.frame = CGRect(x: 0, y: bar.frame.maxY, width: sheet.bounds.width, height: totalH - barH)
  }

  @objc private func tapCancel() { onCancel?() }

  @objc private func tapDone() {
    let f = DateFormatter()
    f.calendar = .current; f.locale = .current; f.timeZone = .current
    f.dateFormat = returnFormat
    onDone?(f.string(from: picker.date))
  }
}

