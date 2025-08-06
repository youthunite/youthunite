export default interface EventData {
  id?: number;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  created_at?: string;
  updated_at?: string;
  organizer_id?: number;
  organizer?: {
    id: number;
    name: string;
  };
}

export interface CreateEventData {
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
}