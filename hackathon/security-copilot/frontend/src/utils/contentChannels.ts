export type ContentType =
  | 'social_media'
  | 'email'
  | 'newsletter'
  | 'blog'
  | 'executive_brief'
  | 'customer_advisory'
  | 'technical_analysis';

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  social_media: 'Social Media → LinkedIn',
  email: 'Email → SMTP',
  newsletter: 'Newsletter → SMTP',
  blog: 'Blog → Internal',
  executive_brief: 'Executive Brief → Blog',
  customer_advisory: 'Customer Advisory → Email',
  technical_analysis: 'Technical Analysis → Blog',
};

export const CHANNEL_FOR_TYPE: Record<string, string> = {
  social_media: 'linkedin',
  email: 'email',
  newsletter: 'email',
  blog: 'blog',
  customer_advisory: 'email',
  executive_brief: 'blog',
  technical_analysis: 'blog',
};

export const CHANNEL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  email: 'Email (SMTP)',
  blog: 'Blog (Internal)',
  internal: 'Internal',
};

export function needsRecipients(contentType: string): boolean {
  return CHANNEL_FOR_TYPE[contentType] === 'email';
}

export function channelForType(contentType: string): string {
  return CHANNEL_FOR_TYPE[contentType] ?? 'internal';
}
