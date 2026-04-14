---
name: frontend-performance
description: Make pages load fast and stay responsive. Invoke when Core Web Vitals regress, pages feel slow, or bundle size balloons.
category: frontend
tags: [web-vitals, performance, bundle-size]
risk: medium
---

# Frontend performance

The user experience is dominated by three things: how fast the page appears, how fast it becomes interactive, and whether it jitters. Google's Core Web Vitals formalize these.

## The three metrics

### Largest Contentful Paint (LCP)

How long until the biggest element is rendered. Target: **< 2.5s**.

Usually blocked by:

- Slow server response (TTFB). Fix: caching, closer infra, smaller payload.
- Render-blocking CSS/JS in `<head>`. Fix: defer, async, critical CSS inlined.
- Large hero images without optimization. Fix: modern formats (WebP, AVIF), responsive sizes, `loading="eager"` on LCP image.
- Web fonts blocking render. Fix: `font-display: swap`, subset fonts, preload critical fonts.

### Interaction to Next Paint (INP)

How long from the user interaction to the next paint. Target: **< 200ms**.

Usually blocked by:

- Long JavaScript tasks on the main thread. Fix: break up tasks, offload to web workers, defer non-critical work.
- Excessive re-renders. Fix: memoization, avoid work in render, virtualize long lists.
- Heavy event handlers. Fix: debounce, throttle, move work off the critical path.

### Cumulative Layout Shift (CLS)

How much the page jumps around as it loads. Target: **< 0.1**.

Usually caused by:

- Images without dimensions. Fix: `width` and `height` attributes, or CSS `aspect-ratio`.
- Ads / embeds injected asynchronously. Fix: reserve space.
- Web fonts that swap after load. Fix: `size-adjust` descriptor, match metrics.
- Dynamically injected content above existing content. Fix: put it below, or reserve space.

## Bundle size

Bigger bundles = more parse time, more network, more JS to execute. Not a linear cost — mobile is much worse than desktop.

### Targets

- **Initial JS:** < 170KB gzipped (or lower for mobile-focused sites).
- **CSS:** < 50KB gzipped.
- **Total transfer for first paint:** < 500KB.

### How to get there

- **Tree-shake** — ensure your bundler is pruning unused exports. Use ES modules.
- **Code split** — per route, per feature. Lazy-load what isn't on the initial page.
- **Analyze the bundle** — `source-map-explorer`, `webpack-bundle-analyzer`, `rollup-plugin-visualizer`. Look for anything you didn't expect.
- **Kill duplicate libraries** — two versions of the same lib in the bundle is common and easy to fix.
- **Polyfill only what you need** — not the whole core-js.
- **Compress** — gzip minimum, Brotli better.

## Rendering strategy

- **Static (SSG):** pre-rendered at build time. Fastest. Works when content is static per build.
- **Server rendered (SSR):** rendered per request. Good for personalized or dynamic content.
- **Client rendered (CSR):** rendered in the browser after JS loads. Slowest first paint; best for highly interactive apps where initial content doesn't matter.
- **Island / partial hydration:** SSR the shell, hydrate only the interactive parts. Modern frameworks (Astro, Qwik, React Server Components) support this.

Pick based on content, not framework preference. A marketing page should not be CSR. An interactive dashboard might need to be.

## Assets

- **Images:** modern formats (WebP, AVIF), responsive `srcset`, lazy load below the fold, `loading="lazy"`, `decoding="async"`.
- **Fonts:** subset, preload, `font-display: swap`, use system fonts where possible.
- **Video:** don't autoplay, use `poster`, serve smaller variants for mobile.
- **Icons:** SVG sprite or inline SVG, not icon fonts.

## Network

- **HTTP/2 or HTTP/3.** Multiplexed requests, header compression.
- **CDN for static assets.** Edge cache close to users.
- **Cache headers.** Long max-age + immutable for hashed filenames, short or no cache for HTML.
- **Preconnect** to domains you'll fetch from: `<link rel="preconnect" href="...">`.
- **Don't preload everything** — preloading too much competes with the critical path.

## Measure, measure, measure

- **Lab data:** Lighthouse, WebPageTest. Controlled, repeatable.
- **Field data:** Real User Monitoring (RUM), `web-vitals` library sending to analytics. What users actually experience.

Both matter. Lab tells you "can it be fast?" Field tells you "is it fast for real users on real networks?"

## Anti-patterns

- **Shipping the whole React ecosystem for a landing page.** Static HTML + a sprinkle of JS is faster and cheaper.
- **Optimizing for Lighthouse score, not real users.** 100 in Lighthouse with bad RUM = users still suffer.
- **Preloading everything.** Self-competes.
- **Waiting for an ideal rewrite.** Ship the 80/20 fixes now: image sizes, bundle analysis, lazy loading, font-display.
- **Measuring on your developer machine.** Fast Mac + fast fiber = fast everything. Test on throttled mobile.
- **`document.write`, huge sync scripts, blocking `<script>` in head.** All ancient patterns still alive in legacy code.
