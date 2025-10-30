import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_ANON_KEY ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

function buildAnalyticsQuery(filters: AnalyticsFilters) {
  let query = supabase.from('analytics_events').select();

  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  if (filters.fileType) {
    query = query.eq('file_type', filters.fileType);
  }
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters.region) {
    query = query.eq('region', filters.region);
  }
  if (filters.ageRange) {
    query = query.eq('age_range', filters.ageRange);
  }
  if (filters.markers && filters.markers.length > 0) {
    query = query.contains('genetic_markers', filters.markers);
  }

  return query;
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      throw new Error('Method not allowed');
    }

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      throw new Error('Invalid token');
    }

    // Get user profile and verify F3 tier
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select()
      .eq('auth_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

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
    const query = buildAnalyticsQuery(filters);
    const { data: events, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

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

    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache'
};