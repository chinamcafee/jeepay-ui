import { formatScaledAmount } from '../appleIap/appleIapUiUtils'

export function isAppleIapOrder(record: any) {
  return record && (record.ifCode === 'apple_iap' || record.wayCode === 'APPLE_IAP')
}

export function nominalAmountText(amount: unknown, currency: unknown) {
  const value = Number(amount)
  if (!Number.isSafeInteger(value)) return '-'
  const code = String(currency || 'CNY').toUpperCase()
  return `${code} ${(value / 100).toFixed(2)}（最小单位 ${value}）`
}

export function channelAmountText(record: any) {
  return formatScaledAmount(record.channelAmount, record.channelAmountScale, record.channelCurrency)
}

export function channelRefundAmountText(record: any) {
  return formatScaledAmount(
    record.channelRefundAmount,
    record.channelRefundAmountScale,
    record.channelRefundCurrency
  )
}

export function deliveryStateMeta(state: unknown) {
  return stateMeta(
    {
      0: ['不适用', 'default'],
      1: ['待交付', 'orange'],
      2: ['已交付', 'green'],
      3: ['交付失败', 'red'],
    },
    state
  )
}

export function finishStateMeta(state: unknown) {
  return stateMeta(
    {
      0: ['无需 Finish', 'default'],
      1: ['待 Finish', 'orange'],
      2: ['Finish 成功', 'green'],
      3: ['Finish 重试中', 'orange'],
      4: ['Finish 死信', 'red'],
    },
    state
  )
}

export function refundStateMeta(state: unknown) {
  return stateMeta(
    {
      0: ['订单生成', 'blue'],
      1: ['退款中', 'orange'],
      2: ['退款成功', 'green'],
      3: ['退款失败', 'red'],
      4: ['任务关闭', 'default'],
      5: ['退款已撤销', 'purple'],
    },
    state
  )
}

export function refundOriginText(origin: unknown) {
  if (Number(origin) === 1) return '商户发起'
  if (Number(origin) === 2) return '渠道产生'
  return `未知(${origin ?? '-'})`
}

function stateMeta(map: Record<number, [string, string]>, state: unknown) {
  return map[Number(state)] || [`未知(${state ?? '-'})`, 'default']
}
