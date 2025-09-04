/* eslint-disable @typescript-eslint/no-floating-promises */
import { MetricType } from 'web-vitals'

type MetricCallback = (metric: MetricType) => void

const reportWebVitals = (onPerfEntry?: MetricCallback): void => {
    console.info('test')
    if (onPerfEntry) {
        import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
            onCLS(onPerfEntry)
            onINP(onPerfEntry)
            onFCP(onPerfEntry)
            onLCP(onPerfEntry)
            onTTFB(onPerfEntry)
        })
    }
}

export default reportWebVitals
