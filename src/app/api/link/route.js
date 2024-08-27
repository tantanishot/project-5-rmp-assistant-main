import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
//puppeteer instead of  playwright
import puppeteer from 'puppeteer';

export async function POST(req){
    console.log('Recieved POST -> link');
    if (req.method !== 'POST') {
        return new NextResponse(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }
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

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');

        
        //specific professor page
        await page.goto('https://www.ratemyprofessors.com/professor/1109134');

        //selecting and extracting the score
        const score = await page.$eval(".RatingValue_Numerator-qw8sqy-2.liyUjw", element => element.textContent);
        console.log('score:', score);

        await browser.close();

        return new NextResponse(JSON.stringify({ "status": "link accessed", "score": score }));

    } catch (error) {
        console.error('API route error:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
