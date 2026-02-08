#!/usr/bin/env node

/**
 * Memory Check Script for Next.js App
 * Run this to check current memory usage and get recommendations
 */

const formatBytes = (bytes) => {
  return Math.round(bytes / 1024 / 1024) + ' MB'
}

const checkMemory = () => {
  const memoryUsage = process.memoryUsage()
  
  console.log('\n=== Memory Usage Report ===\n')
  
  console.log(`Heap Used:     ${formatBytes(memoryUsage.heapUsed)}`)
  console.log(`Heap Total:    ${formatBytes(memoryUsage.heapTotal)}`)
  console.log(`RSS:           ${formatBytes(memoryUsage.rss)}`)
  console.log(`External:      ${formatBytes(memoryUsage.external)}`)
  console.log(`Array Buffers: ${formatBytes(memoryUsage.arrayBuffers || 0)}`)
  
  const heapUsagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
  console.log(`\nHeap Usage:    ${heapUsagePercent}%`)
  
  console.log('\n=== Status ===\n')
  
  if (heapUsagePercent < 70) {
    console.log('✅ Memory usage is healthy')
  } else if (heapUsagePercent < 85) {
    console.log('⚠️  Memory usage is elevated')
    console.log('\nRecommendations:')
    console.log('  - Review recent API calls for large data returns')
    console.log('  - Check for unclosed database connections')
    console.log('  - Consider restarting the application')
  } else {
    console.log('🚨 Memory usage is critically high!')
    console.log('\nImmediate Actions:')
    console.log('  - Restart the application immediately')
    console.log('  - Check logs for memory leaks')
    console.log('  - Review recent code changes')
    console.log('  - Consider increasing heap size with NODE_OPTIONS=--max-old-space-size=4096')
  }
  
  console.log('\n=== Memory Optimization Tips ===\n')
  console.log('1. Use pagination for large datasets')
  console.log('2. Limit API response sizes with query parameters')
  console.log('3. Clear unused variables and close connections')
  console.log('4. Use streaming for large responses')
  console.log('5. Enable gzip compression')
  console.log('6. Monitor with: npm run check-memory')
  console.log('')
}

// Run check
checkMemory()

// If running in watch mode
if (process.argv.includes('--watch')) {
  console.log('Watching memory usage every 10 seconds... (Ctrl+C to stop)\n')
  setInterval(checkMemory, 10000)
}
