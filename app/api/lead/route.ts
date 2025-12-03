import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      email,
      full_name,
      interest_investing,
      interest_contributing,
      interest_ambassador,
      interest_beta_tester,
      message,
      source,
    } = body;

    const { error } = await supabase.from("leads_landing").insert([
      {
        email,
        full_name,
        interest_investing,
        interest_contributing,
        interest_ambassador,
        interest_beta_tester,
        message,
        source,
      },
    ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ success: false, error: 'DB_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error('API /api/lead error:', e);
    return NextResponse.json({ success: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
