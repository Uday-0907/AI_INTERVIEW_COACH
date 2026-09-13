import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // 1. Get user_id from query parameters or session auth header
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required to fetch history.' },
        { status: 400 }
      );
    }

    // 2. Query Supabase for past interview sessions
    const { data: sessions, error } = await supabase
      .from('interview_sessions')
      .select('id, user_id, target_role, interview_type, evaluation, transcript, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Query Error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve past interview sessions.' },
        { status: 500 }
      );
    }

    // 3. Return the array of past sessions
    return NextResponse.json({ sessions });
  } catch (err: any) {
    console.error('Sessions API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}