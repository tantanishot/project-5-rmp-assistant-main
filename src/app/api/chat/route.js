import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'

const systemPrompt = `
You are a rate my professor agent to help students find classes, that takes in user questions and answers them.
For every user question, the top 3 professors that match the user question are returned.
Use them to answer the question if needed.
`

export async function POST(req) {
    console.log('Received POST'); 
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
        console.log('Initializing OpenAI'); 
        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY
        });

        const data = await req.json();
        console.log('Request body:', data); 
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid request body');
        }

        const text = data[data.length - 1].content;
        console.log('Text:', text);
        
        // const embedding = await openai.embeddings.create({
        //     model: "meta-llama/llama-3.1-8b-instruct:free",
        //     input: text,
        //     encoding_format: 'float',
        // });

        console.log('Prior results');
        const results = await index.query({
            topK: 5,
            includeMetadata: true,
            // vector: embedding.data[0].embedding,
        });
        console.log('Past results:', results); 

        let resultString = '';
        results.matches.forEach((match) => {
            resultString += `
            Returned Results:
            Professor: ${match.id}
            Review: ${match.metadata.stars}
            Subject: ${match.metadata.subject}
            Stars: ${match.metadata.stars}
            \n\n`;
        });
    
        const lastMessage = data[data.length - 1];
        const lastMessageContent = lastMessage.content + resultString;
        const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

        const completion = await openai.chat.completions.create({
            messages: [
            {role: 'system', content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent},
            ],
            model: "meta-llama/llama-3.1-8b-instruct:free",
            stream: true,
        });
    
        const stream = new ReadableStream({
            async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    const text = encoder.encode(content);
                    controller.enqueue(text);
                }
                }
            } catch (err) {
                console.error('Streaming error:', err);
                controller.error(err);
            } finally {
                controller.close();
            }
            },
        });
        return new NextResponse(stream);
    } catch (error) {
        console.error('API route error:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        });
    }
}