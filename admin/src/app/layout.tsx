import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentStaffName } from '@/lib/admin-key';
import { signOut } from './login/actions';
import './globals.css';

export const metadata: Metadata = {
    title: 'Upcheck admin',
    description: 'Farmer issue reports and app announcements',
    // Internal tool behind a Vercel deployment — keep it out of search results.
    robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    // Not present on /login (middleware.ts is what actually gates access —
    // this is only what the header shows). getCurrentStaffName() never
    // throws, so /login renders fine with no cookie yet.
    const staffName = await getCurrentStaffName();

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
                    <Link href="/storage">Storage</Link>
                    <Link href="/access-log">Access log</Link>
                    {staffName && (
                        <span className="who">
                            {staffName}
                            <form action={signOut} className="signout">
                                <button type="submit">Sign out</button>
                            </form>
                        </span>
                    )}
                </nav>
                <main>{children}</main>
            </body>
        </html>
    );
}
