import type EventData from '$lib/types/event';
import { getTokenFromCookie } from '$lib/server/auth';

interface FetchEventsResult {
  success: boolean;
  error?: string;
  events?: EventData[];
}

export async function fetchEvents(): Promise<FetchEventsResult> {
  try {
    const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/events/`);
    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        events: result.events
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to fetch events'
      };
    }
  } catch (error) {
    console.error('Events fetch error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}

export async function fetchMyEvents(cookieHeader: string | null): Promise<FetchEventsResult> {
  const token = getTokenFromCookie(cookieHeader);
  
  if (!token) {
    return {
      success: false,
      error: 'Authentication required.'
    };
  }

  try {
    const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/events/my-events`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        events: result.events
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to fetch your events'
      };
    }
  } catch (error) {
    console.error('My events fetch error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}

export async function fetchEventById(id: string): Promise<{ success: boolean; error?: string; event?: EventData }> {
  try {
    const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/events/${id}`);
    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        event: result.event
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to fetch event'
      };
    }
  } catch (error) {
    console.error('Event fetch error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}
