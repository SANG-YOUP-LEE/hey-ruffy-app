# BRIEFING — HeyRuffy alarms & deeplink (fix set)

## 무엇(What)
- 평일(월~금) 알람 누락/간헐적 미수신
- 편집/추가 후 중복/유실
- 딥링크 비활성(알림 탭 → 메인뷰)
- 월간 날짜 선택 최대 3개 제한

## 왜(Why)
- 요일 인덱스 불일치: UI(1=월) ↔ iOS(1=일) 불일치
- 탭 시 딥링크 이벤트로 라우팅 → 요구사항 변경
- 월간 상한 검증 없음

## 어떻게(How)
- iosRoutineScheduler: 요일 인덱스 iOS 변환(월1→2 … 일7→1)
- main/deeplink/AppDelegate: 딥링크 완전 비활성
- routineForm: 월간 날짜 3개 제한
