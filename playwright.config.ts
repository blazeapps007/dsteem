import {defineConfig, devices} from '@playwright/test'

// Playwright runs only the browser-smoke spec (the *.spec.ts file). Regular
// Mocha tests live under test/*.ts and use a different runner.
export default defineConfig({
    testDir: 'test',
    testMatch: '*.spec.ts',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    use: {
        launchOptions: {headless: true}
    },
    projects: [
        {name: 'chromium', use: {...devices['Desktop Chrome']}},
        {name: 'firefox', use: {...devices['Desktop Firefox']}},
        {name: 'webkit', use: {...devices['Desktop Safari']}}
    ]
})
