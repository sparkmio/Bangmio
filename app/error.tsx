'use client'
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="panel error-state"><strong>页面加载失败</strong><span>可以重试一次，或者回到首页。</span><button className="button primary" type="button" onClick={() => reset()}>重试</button></div> }
