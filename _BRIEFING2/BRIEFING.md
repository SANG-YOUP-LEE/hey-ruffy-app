# BRIEFING — HeyRuffy alarms FINAL

## Fixes
- 간헐적 알림 안옴 → iosRoutineScheduler 싱크를 main.js에서 uid 기반으로 init/stop 관리
- 새 다짐 시 꼬임 → 부분 purge + hash guard 적용
- 중복 알림 방지 → 배치 포스터 + dedup hash
- 딥링크 → 완전 비활성, 알림 탭시 메인뷰만
- 월간 날짜 → 최대 3개 제한
