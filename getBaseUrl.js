// /api/utils/getBaseUrl.js

export function getBaseUrl() {
    // Use Vercel's system environment variable in production, otherwise default to localhost.
    return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
}