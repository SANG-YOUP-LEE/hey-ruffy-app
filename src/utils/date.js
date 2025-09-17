// src/utils/date.js
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export const todayKey = () => dayjs().tz('Asia/Seoul').format('YYYY-MM-DD')
export const toKey = (d) => dayjs(d).tz('Asia/Seoul').format('YYYY-MM-DD')
