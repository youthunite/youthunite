import type { CreateEventData } from '$lib/types/event';
import { getServerUser, getTokenFromCookie } from '$lib/server/auth';

interface RegisterEventResult {
  success: boolean;
  error?: string;
  event?: any;
}

export async function registerEvent(
  eventData: CreateEventData,
  cookieHeader: string | null
): Promise<RegisterEventResult> {
  const token = getTokenFromCookie(cookieHeader);
  
  if (!token) {
    return {
      success: false,
      error: 'Authentication required. Please log in to create an event.'
    };
  }

  const user = await getServerUser(token);
  
  if (!user) {
    return {
      success: false,
      error: 'Invalid authentication. Please log in again.'
    };
  }

  try {
    const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/events/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        event: result.event
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to create event'
      };
    }
  } catch (error) {
    console.error('Event registration error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}

export function validateEventData(eventData: Partial<CreateEventData>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!eventData.title?.trim()) {
    errors.push('Event title is required');
  } else if (eventData.title.length > 100) {
    errors.push('Event title must be 100 characters or less');
  }

  if (!eventData.description?.trim()) {
    errors.push('Event description is required');
  }

  if (!eventData.location?.trim()) {
    errors.push('Event location is required');
  } else if (eventData.location.length > 255) {
    errors.push('Event location must be 255 characters or less');
  }

  if (!eventData.start_time) {
    errors.push('Event start time is required');
  } else {
    const startTime = new Date(eventData.start_time);
    const now = new Date();
    if (startTime <= now) {
      errors.push('Event start time must be in the future');
    }
  }

  if (!eventData.end_time) {
    errors.push('Event end time is required');
  } else if (eventData.start_time) {
    const startTime = new Date(eventData.start_time);
    const endTime = new Date(eventData.end_time);
    if (endTime <= startTime) {
      errors.push('Event end time must be after start time');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
