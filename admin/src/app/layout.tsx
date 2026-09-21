import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
    title: 'Upcheck admin',
    description: 'Farmer issue reports and app announcements',
    // Internal tool behind a Vercel deployment — keep it out of search results.
    robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <nav className="top-nav">
                    <Link href="/">Overview</Link>
                    <Link href="/reports">Feedback</Link>
                    <Link href="/users">Users</Link>
                    <Link href="/farms">Farms</Link>
                    <Link href="/announcements">Announcements</Link>
                    <Link href="/news">News</Link>
                    <Link href="/prices">Prices</Link>
                    <Link href="/photos">Photos</Link>
                </nav>
                <main>{children}</main>
            </body>
        </html>
    );
}
