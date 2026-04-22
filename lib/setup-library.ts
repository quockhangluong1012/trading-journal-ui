import type { TradingSetupSummaryDto } from "./setup-api"

function getUpdatedTimestamp(lastUpdatedAt: string): number {
  const timestamp = Date.parse(lastUpdatedAt)

  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function sortSetupsByNewest(setups: TradingSetupSummaryDto[]): TradingSetupSummaryDto[] {
  return setups
    .map((setup, index) => ({
      index,
      setup,
    }))
    .sort((left, right) => {
      const timestampDifference = getUpdatedTimestamp(right.setup.lastUpdatedAt) - getUpdatedTimestamp(left.setup.lastUpdatedAt)

      if (timestampDifference !== 0) {
        return timestampDifference
      }

      return left.index - right.index
    })
    .map(({ setup }) => setup)
}

export function filterSetupsByQuery(
  setups: TradingSetupSummaryDto[],
  query: string,
): TradingSetupSummaryDto[] {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return [...setups]
  }

  return setups.filter((setup) => {
    const haystack = `${setup.name} ${setup.description ?? ""}`.toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}

export function getVisibleTradingSetups(
  setups: TradingSetupSummaryDto[],
  query: string,
): TradingSetupSummaryDto[] {
  return filterSetupsByQuery(sortSetupsByNewest(setups), query)
}