export interface InferencePayload {
  userId: string;
  messageId: number;
  text: string;
  context: string[];
}

export interface InferenceResponse {
  source: 'gemini' | 'borg' | 'error';
  text?: string;
  status?: string;
  message?: string;
}
