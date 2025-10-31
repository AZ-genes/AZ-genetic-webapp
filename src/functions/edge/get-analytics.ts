import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

interface AnalyticsEvent {
  id: string;
  event_type: string;
  file_type: string;
  region: string;
  age_range: string;
  genetic_markers: string[];
  created_at: string;
}

interface AggregatedStats {
  total_records: number;
  file_type_distribution: Record<string, number>;
  region_distribution: Record<string, number>;
  age_distribution: Record<string, number>;
  marker_frequency: Record<string, number>;
  time_series_data: TimeSeriesData[];
}

interface TimeSeriesData {
  date: string;
  count: number;
  file_type?: string;
}

interface AnalyticsFilters {
  eventType?: string;
  fileType?: string;
  startDate?: string;
  endDate?: string;
  region?: string;
  ageRange?: string;
  markers?: string[];
}

// Privacy thresholds
const MIN_AGGREGATE_SIZE = 5; // Minimum number of records needed for aggregation
const MAX_DETAIL_LEVEL = 3; // Maximum number of subcategories to show

function aggregateAnalytics(events: AnalyticsEvent[]): AggregatedStats {
  if (events.length < MIN_AGGREGATE_SIZE) {
    throw new Error('Insufficient data for aggregation');
  }

  const stats: AggregatedStats = {
    total_records: events.length,
    file_type_distribution: {},
    region_distribution: {},
    age_distribution: {},
    marker_frequency: {},
    time_series_data: []
  };

  // Aggregate file types
  events.forEach(event => {
    stats.file_type_distribution[event.file_type] = (stats.file_type_distribution[event.file_type] || 0) + 1;
    stats.region_distribution[event.region] = (stats.region_distribution[event.region] || 0) + 1;
    stats.age_distribution[event.age_range] = (stats.age_distribution[event.age_range] || 0) + 1;
    
    event.genetic_markers.forEach(marker => {
      stats.marker_frequency[marker] = (stats.marker_frequency[marker] || 0) + 1;
    });
  });

  // Apply privacy thresholds
  Object.entries(stats.file_type_distribution).forEach(([key, value]) => {
    if (value < MIN_AGGREGATE_SIZE) {
      delete stats.file_type_distribution[key];
    }
  });

  // Limit detail level
  stats.marker_frequency = Object.fromEntries(
    Object.entries(stats.marker_frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, MAX_DETAIL_LEVEL)
  );

  // Generate time series data
  const timeSeriesMap = new Map<string, number>();
  events.forEach(event => {
    const date = event.created_at.split('T')[0];
    timeSeriesMap.set(date, (timeSeriesMap.get(date) || 0) + 1);
  });

  stats.time_series_data = Array.from(timeSeriesMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return stats;
}

function buildAnalyticsQuery(firestore: AuthContext['firestore'], filters: AnalyticsFilters) {
  let query: any = firestore.collection('analytics_events');

  if (filters.eventType) {
    query = query.where('event_type', '==', filters.eventType);
  }
  if (filters.fileType) {
    query = query.where('file_type', '==', filters.fileType);
  }
  if (filters.startDate) {
    query = query.where('created_at', '>=', filters.startDate);
  }
  if (filters.endDate) {
    query = query.where('created_at', '<=', filters.endDate);
  }
  if (filters.region) {
    query = query.where('region', '==', filters.region);
  }
  if (filters.ageRange) {
    query = query.where('age_range', '==', filters.ageRange);
  }
  if (filters.markers && filters.markers.length > 0) {
    query = query.where('genetic_markers', 'array-contains-any', filters.markers);
  }

  return query;
}

async function handleGetAnalytics(req: Request, context: AuthContext): Promise<Response> {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  try {
    const { user, firestore } = context;

    const profileRef = firestore.collection('user_profiles').doc(user.uid);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      throw new Error('User profile not found');
    }
    const profile = profileDoc.data();

    if (profile.subscription_tier !== 'F3') {
      throw new Error('Analytics access restricted to F3 users');
    }

    // Get query parameters
    const url = new URL(req.url);
    const filters: AnalyticsFilters = {
      eventType: url.searchParams.get('eventType') || undefined,
      fileType: url.searchParams.get('fileType') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      region: url.searchParams.get('region') || undefined,
      ageRange: url.searchParams.get('ageRange') || undefined,
      markers: url.searchParams.get('markers')?.split(',') || undefined
    };

    // Validate date range
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

      if (end.getTime() - start.getTime() > maxRange) {
        throw new Error('Date range cannot exceed 90 days');
      }
    }

    // Build and execute query
    const query = buildAnalyticsQuery(firestore, filters);
    const snapshot = await query.get();
    const events = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({
        message: 'No data available for the specified criteria'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 204
      });
    }

    try {
      // Aggregate and anonymize data
      const aggregatedStats = aggregateAnalytics(events);

      return new Response(JSON.stringify({
        data: aggregatedStats,
        metadata: {
          filters: filters,
          timestamp: new Date().toISOString(),
          privacy_note: 'Data is aggregated and anonymized. Individual records are not accessible.'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient data for aggregation') {
        return new Response(JSON.stringify({
          message: 'Insufficient data to generate anonymized statistics'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 204
        });
      }
      throw error;
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && 
      (message.includes('Date range') || message.includes('restricted')) ? 400 : 500;

    // Log the error
    try {
      await context.firestore.collection('error_logs').add({
        error_type: 'get_analytics_failed',
        error_message: message,
        metadata: {
          request_url: req.url,
          timestamp: new Date().toISOString(),
          user_id: context.user.id
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
}

export async function onRequest(req: Request, context: AuthContext): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      code: 'MethodNotAllowed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    return await withAuth(req, context, handleGetAnalytics);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && 
      (message.includes('Date range') || message.includes('restricted')) ? 400 : 500;

    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
}