'use client';
/**
 * @fileOverview A flow for generating video thumbnails using AI.
 * 
 * - generateThumbnail - A function that generates a thumbnail image data URI from a title and notes.
 * - GenerateThumbnailInput - The input type for the generateThumbnail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateThumbnailInputSchema = z.object({
    title: z.string().describe('The title of the video project.'),
    notes: z.string().describe('Additional notes or a description of the video content.'),
});
export type GenerateThumbnailInput = z.infer<typeof GenerateThumbnailInputSchema>;

// This flow is no longer the primary method for thumbnail generation but is kept for potential future use.
// The primary method is now client-side frame extraction in `src/firebase/storage.ts`.
export async function generateThumbnail(input: GenerateThumbnailInput): Promise<string | null> {
    return generateThumbnailFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateThumbnailPrompt',
    input: { schema: GenerateThumbnailInputSchema },
    prompt: `
        You are an expert graphic designer specializing in creating compelling video thumbnails.
        Generate a professional, visually appealing thumbnail for a video project.

        Video Title: {{{title}}}
        Video Description/Notes: {{{notes}}}

        Instructions:
        - The thumbnail should be cinematic, high-quality, and visually engaging.
        - The style should be suitable for a professional video review and collaboration platform.
        - DO NOT include any text, logos, or watermarks in the image. The image should be purely visual.
        - Capture the essence and mood of the video based on the title and description.
        - The output should be a single, clean image.
    `,
});

const generateThumbnailFlow = ai.defineFlow(
    {
        name: 'generateThumbnailFlow',
        inputSchema: GenerateThumbnailInputSchema,
        outputSchema: z.string().nullable(),
    },
    async (input) => {
        try {
            const { media } = await ai.generate({
                model: 'googleai/imagen-4.0-fast-generate-001',
                prompt: await prompt(input),
            });
            return media.url;
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            return null;
        }
    }
);
