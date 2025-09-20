export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type VerificationStatus = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];

export interface VerificationAction {
  status: VerificationStatus;
  reason?: string;
  verifiedBy: number;
  verifiedAt: number;
}

export interface StorySubmission {
  title: string;
  content: string;
  authorName: string;
  authorEmail: string;
  authorAge?: number;
  category?: string;
  tags?: string[];
}

export interface EventVerificationData {
  eventId: number;
  title: string;
  description: string;
  location: string;
  organizerName: string;
  organizerEmail: string;
  startTime: number;
  endTime: number;
}

export interface StoryVerificationData {
  storyId: number;
  title: string;
  content: string;
  authorName: string;
  authorEmail: string;
  category?: string;
  tags?: string[];
  createdAt: number;
}