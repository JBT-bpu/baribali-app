// Main Page - Video Homepage with VideoQueue Architecture
import VideoMenuQueue from '@/components/video-menu/VideoMenuQueue';

export default function HomePage() {
    return (
        <main
            style={{
                minHeight: '100vh',
                backgroundColor: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '420px',
                    aspectRatio: '9/16',
                    overflow: 'hidden',
                }}
            >
                <VideoMenuQueue />
            </div>
        </main>
    );
}
