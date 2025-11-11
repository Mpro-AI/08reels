'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting video annotations using AI.
 *
 * - suggestAnnotationsWithAI - An async function that takes video data and returns suggested annotations.
 * - SuggestAnnotationsWithAIInput - The input type for the suggestAnnotationsWithAI function.
 * - SuggestAnnotationsWithAIOutput - The return type for the suggestAnnotationsWithAI function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAnnotationsWithAIInputSchema = z.object({
  videoUrl: z
    .string()
    .describe(
      'The video data as a public URL or a data URI.'
    ),
});
export type SuggestAnnotationsWithAIInput = z.infer<typeof SuggestAnnotationsWithAIInputSchema>;

const SuggestAnnotationsWithAIOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      timecode: z.string().describe('The timecode of the suggested annotation in HH:MM:SS format.'),
      content: z.string().describe('The suggested annotation text, providing constructive feedback for video improvement.'),
    })
  ).describe('A list of suggested annotations.'),
});
export type SuggestAnnotationsWithAIOutput = z.infer<typeof SuggestAnnotationsWithAIOutputSchema>;

export async function suggestAnnotationsWithAI(input: SuggestAnnotationsWithAIInput): Promise<SuggestAnnotationsWithAIOutput> {
  return suggestAnnotationsWithAIFlow(input);
}

const suggestAnnotationsPrompt = ai.definePrompt({
  name: 'suggestAnnotationsPrompt',
  input: {schema: SuggestAnnotationsWithAIInputSchema},
  output: {schema: SuggestAnnotationsWithAIOutputSchema},
  prompt: `You are an expert video editor providing feedback on a video. Analyze the provided video and suggest specific, actionable improvements with timestamps.

  For each suggestion, provide the timecode in HH:MM:SS format and a clear, concise comment on what could be improved.
  Focus on aspects like pacing, editing, shot composition, color grading, and audio.

  Here is the video to analyze: {{media url=videoUrl}}
  
  Return the suggestions in the format specified by the SuggestAnnotationsWithAIOutputSchema. If no suggestions can be made, return an empty array.`,  
});

const suggestAnnotationsWithAIFlow = ai.defineFlow(
  {
    name: 'suggestAnnotationsWithAIFlow',
    inputSchema: SuggestAnnotationsWithAIInputSchema,
    outputSchema: SuggestAnnotationsWithAIOutputSchema,
  },
  async input => {
    const {output} = await suggestAnnotationsPrompt(input);
    return output!;
  }
);
