// Test page to verify video files are being served correctly
'use client';

export default function TestVideoPage() {
    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Video Test Page</h1>
            <p>This page tests if video files are being served correctly by Next.js.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <h2>Intro Video</h2>
                    <video
                        src="/video/intro.mp4"
                        controls
                        style={{ width: '300px', maxHeight: '400px' }}
                    />
                    <p>File: /video/intro.mp4</p>
                </div>

                <div>
                    <h2>Loop 1</h2>
                    <video
                        src="/video/loop1.mp4"
                        controls
                        style={{ width: '300px', maxHeight: '400px' }}
                    />
                    <p>File: /video/loop1.mp4</p>
                </div>

                <div>
                    <h2>Loop 2</h2>
                    <video
                        src="/video/loop2.mp4"
                        controls
                        style={{ width: '300px', maxHeight: '400px' }}
                    />
                    <p>File: /video/loop2.mp4</p>
                </div>

                <div>
                    <h2>Outro</h2>
                    <video
                        src="/video/outro.mp4"
                        controls
                        style={{ width: '300px', maxHeight: '400px' }}
                    />
                    <p>File: /video/outro.mp4</p>
                </div>
            </div>

            <div style={{ marginTop: '40px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
                <h2>Expected Results:</h2>
                <ul>
                    <li>If videos play correctly → Next.js is serving files properly</li>
                    <li>If videos show errors → Video files are corrupted or wrong format</li>
                    <li>If videos don't load at all → Next.js public folder configuration issue</li>
                </ul>
                <p style={{ marginTop: '20px' }}>
                    <a href="/" style={{ color: '#0066cc' }}>← Back to Homepage</a>
                </p>
            </div>
        </div>
    );
}
