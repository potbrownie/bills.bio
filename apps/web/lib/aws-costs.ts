/**
 * AWS Cost Explorer integration for real-time billing data
 * 
 * To use this, you need to:
 * 1. Set AWS credentials in environment variables:
 *    - AWS_ACCESS_KEY_ID
 *    - AWS_SECRET_ACCESS_KEY
 *    - AWS_REGION (default: us-east-1)
 * 
 * 2. Install the AWS SDK:
 *    npm install @aws-sdk/client-cost-explorer
 * 
 * 3. Ensure your IAM user has the following permissions:
 *    - ce:GetCostAndUsage
 *    - ce:GetCostForecast
 */

interface AWSCostData {
  total_cost: number
  services: Array<{
    service: string
    cost: number
  }>
  forecast?: number
}

/**
 * Fetch AWS costs for a given time period
 * This is a placeholder that returns mock data. To use real data:
 * 1. Install @aws-sdk/client-cost-explorer
 * 2. Uncomment the implementation below
 */
export async function getAWSCosts(
  startDate: Date,
  endDate: Date
): Promise<AWSCostData> {
  // Check if AWS credentials are configured
  const hasAWSCredentials =
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY

  if (!hasAWSCredentials) {
    // Return mock/estimated data
    return {
      total_cost: 0,
      services: [],
    }
  }

  try {
    // Real implementation using AWS SDK
    // Uncomment this when you install @aws-sdk/client-cost-explorer
    /*
    const { CostExplorerClient, GetCostAndUsageCommand } = await import(
      '@aws-sdk/client-cost-explorer'
    )

    const client = new CostExplorerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })

    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: formatAWSDate(startDate),
        End: formatAWSDate(endDate),
      },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE',
        },
      ],
    })

    const response = await client.send(command)

    const services: Array<{ service: string; cost: number }> = []
    let totalCost = 0

    if (response.ResultsByTime && response.ResultsByTime.length > 0) {
      const period = response.ResultsByTime[0]
      if (period.Groups) {
        for (const group of period.Groups) {
          const serviceName = group.Keys?.[0] || 'Unknown'
          const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0')
          services.push({
            service: serviceName,
            cost,
          })
          totalCost += cost
        }
      }
    }

    return {
      total_cost: totalCost,
      services: services.sort((a, b) => b.cost - a.cost),
    }
    */

    // Fallback to estimated data
    return {
      total_cost: 0,
      services: [],
    }
  } catch (error) {
    console.error('Failed to fetch AWS costs:', error)
    return {
      total_cost: 0,
      services: [],
    }
  }
}

/**
 * Format date for AWS Cost Explorer API (YYYY-MM-DD)
 */
function formatAWSDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Estimate AWS costs based on usage patterns
 * Used when AWS Cost Explorer is not configured
 */
export function estimateAWSCosts(params: {
  sesEmailsSent: number
  s3StorageGB?: number
  lambdaInvocations?: number
}): AWSCostData {
  const services: Array<{ service: string; cost: number }> = []

  // AWS SES: $0.10 per 1,000 emails
  if (params.sesEmailsSent > 0) {
    services.push({
      service: 'Simple Email Service',
      cost: (params.sesEmailsSent / 1000) * 0.1,
    })
  }

  // AWS S3: ~$0.023 per GB per month
  if (params.s3StorageGB && params.s3StorageGB > 0) {
    services.push({
      service: 'S3',
      cost: params.s3StorageGB * 0.023,
    })
  }

  // AWS Lambda: $0.20 per 1M requests
  if (params.lambdaInvocations && params.lambdaInvocations > 0) {
    services.push({
      service: 'Lambda',
      cost: (params.lambdaInvocations / 1_000_000) * 0.2,
    })
  }

  const totalCost = services.reduce((sum, s) => sum + s.cost, 0)

  return {
    total_cost: totalCost,
    services: services.sort((a, b) => b.cost - a.cost),
  }
}
