import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import puppeteer from 'puppeteer';

export async function POST(req) {
    console.log('Received POST -> link');
    
    if (req.method !== 'POST') {
        return new NextResponse(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let browser;
    try {
        console.log('Initializing Pinecone');
        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        const index = pc.index('rag').namespace('ns1');

        const data = await req.json();
        console.log('Request body:', data);

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid request body');
        }

        const link = data[data.length - 1].content;
        console.log('Link:', link);

        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
       
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
       
        await page.goto(link, { waitUntil: 'networkidle0' });

        const rating = await page.evaluate(() => {
          const ratingElement = document.querySelector('.RatingValue__Numerator-qw8sqy-2');
          return ratingElement ? ratingElement.textContent.trim() : 'N/A';
        });

        console.log('score:', rating);

        return new NextResponse(JSON.stringify({ "status": "link accessed", "score": rating }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('API route error:', error);
        
        let errorMessage = 'An unexpected error occurred';
        let statusCode = 500;

        return new NextResponse(JSON.stringify({ error: errorMessage }), {
            status: statusCode,
            headers: { 'Content-Type': 'application/json' },
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}