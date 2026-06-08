import {test, expect} from '@playwright/test'
import {pathToFileURL} from 'url'
import * as path from 'path'

const runner = pathToFileURL(path.join(__dirname, 'browser-runner.html')).toString()

test.describe('dsteem browser bundle', () => {
    test('smoke: hash + sign + verify + recover', async ({page}) => {
        // Capture any browser console errors so they show up in test output.
        const consoleErrors: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'error') { consoleErrors.push(msg.text()) }
        })
        page.on('pageerror', (err) => { consoleErrors.push(err.message) })

        await page.goto(runner)
        // Wait for the inline IIFE to set either __dsteemSmokeOk or __dsteemSmokeError.
        await page.waitForFunction(() =>
            (window as any).__dsteemSmokeOk === true || typeof (window as any).__dsteemSmokeError === 'string',
        {timeout: 10000})

        const result = await page.evaluate(() => ({
            ok: (window as any).__dsteemSmokeOk === true,
            error: (window as any).__dsteemSmokeError,
            output: document.getElementById('out')?.textContent || ''
        }))

        if (!result.ok) {
            throw new Error(
                `Browser smoke failed: ${result.error}\n--- page output ---\n${result.output}\n` +
                    `--- console errors ---\n${consoleErrors.join('\n')}`
            )
        }
        expect(result.output).toContain('ALL OK')
    })
})
