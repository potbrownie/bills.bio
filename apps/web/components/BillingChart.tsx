'use client'

interface BillingChartProps {
  data: Array<{
    period: string
    openai_cost: number
    aws_cost: number
    total_cost: number
  }>
}

export default function BillingChart({ data }: BillingChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  // Find max value for scaling
  const maxCost = Math.max(...data.map((d) => d.total_cost))
  const maxHeight = 200 // pixels

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="flex items-end justify-between gap-2 h-[200px]">
        {data.reverse().map((period, index) => {
          const heightPercent = (period.total_cost / maxCost) * 100
          const openaiPercent = (period.openai_cost / period.total_cost) * 100
          const awsPercent = (period.aws_cost / period.total_cost) * 100

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              {/* Bar */}
              <div
                className="w-full bg-warm-cream/30 rounded-t-lg overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity group"
                style={{ height: `${heightPercent}%`, minHeight: period.total_cost > 0 ? '20px' : '0' }}
                title={`${period.period}: $${period.total_cost.toFixed(2)}`}
              >
                {/* AWS portion */}
                <div
                  className="absolute bottom-0 w-full bg-blue-400/60"
                  style={{ height: `${awsPercent}%` }}
                />
                {/* OpenAI portion */}
                <div
                  className="absolute top-0 w-full bg-warm-gold/60"
                  style={{ height: `${openaiPercent}%` }}
                />
                
                {/* Tooltip on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-charcoal/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    ${period.total_cost.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="text-xs text-taupe text-center">
                {period.period.split(' ')[0].slice(0, 3)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-warm-gold/60 rounded" />
          <span className="text-taupe">OpenAI</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-400/60 rounded" />
          <span className="text-taupe">AWS</span>
        </div>
      </div>
    </div>
  )
}
