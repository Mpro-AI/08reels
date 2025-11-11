'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting video annotations using AI.
 *
 * - suggestAnnotationsWithAI - An async function that takes video data and returns suggested annotations.
 * - SuggestAnnotationsWithAIInput - The input type for the suggestAnnotationsWithAI function.
 * - SuggestAnnotationsWithAIOutput - The return type for the suggestAnnotationsWithAI function.
 */

import {ai} from '@/ai/genkit';
import {getDownloadURL, ref, getStorage} from 'firebase/storage';
import {z} from 'genkit';

const SuggestAnnotationsWithAIInputSchema = z.object({
  videoUrl: z
    .string()
    .describe(
      'The Firebase Storage URL (gs://...) of the video to analyze.'
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


async function getPublicUrl(gsUrl: string) {
  try {
    const storage = getStorage();
    const storageRef = ref(storage, gsUrl);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error getting public URL from GS URL:", error);
    // In case of error, we might want to return the original URL
    // or handle it appropriately, maybe the flow should fail.
    return gsUrl;
  }
}


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

  Here is the video to analyze: {{media url=(await getPublicUrl(videoUrl))}}
  
  Return the suggestions in the format specified by the SuggestAnnotationsWithAIOutputSchema. If no suggestions can be made, return an empty array.`,  
  tools: [getPublicUrl]
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
