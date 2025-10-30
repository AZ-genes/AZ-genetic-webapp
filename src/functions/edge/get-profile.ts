// This file targets a Deno edge runtime. Disable type-checking locally to avoid
// editor/tsserver errors about Deno/remote imports in the development environment.
// We keep runtime imports as-is for the edge deployment.
// @ts-nocheck
declare const Deno: any;

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { UserProfile } from '../types'
import { withAuth } from './middleware/auth'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req: Request) => withAuth(req, { supabase }, async (req, context) => {
  try {
    const { user } = context;

    // Get or create profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select()
      .eq('auth_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError
    }

    if (!profile) {
      const newProfile: Partial<UserProfile> = {
        auth_id: user.id,
        subscription_tier: 'F1'
      }

      const { data: createdProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert(newProfile)
        .select()
        .single()

      if (createError) {
        throw createError
      }

      return new Response(JSON.stringify(createdProfile), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}