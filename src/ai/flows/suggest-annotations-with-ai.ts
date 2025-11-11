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
  videoDataUri: z
    .string()
    .describe(
      'The video data as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type SuggestAnnotationsWithAIInput = z.infer<typeof SuggestAnnotationsWithAIInputSchema>;

const SuggestAnnotationsWithAIOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      timecode: z.string().describe('The timecode of the suggested annotation (e.g., 00:01:23).'),
      content: z.string().describe('The suggested annotation text.'),
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
  prompt: `You are an AI assistant that analyzes video content and provides annotation suggestions. 

  Analyze the video provided and suggest potential annotations, including the timecode and annotation text.

  Here is the video to analyze: {{media url=videoDataUri}}
  
  Return the suggestions in the format specified by the SuggestAnnotationsWithAIOutputSchema.`,  
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
