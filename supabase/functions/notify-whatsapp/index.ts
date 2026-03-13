import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WAHA_API_URL = Deno.env.get('WAHA_API_URL');
    // If you use an API key in WAHA, add it here
    // const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY');

    if (!WAHA_API_URL) {
      console.warn('WAHA_API_URL is not configured. Messages will not be sent.');
      return new Response(JSON.stringify({ success: false, error: 'WAHA not configured' }), {
        status: 200, // Returning 200 to prevent trigger failure if not configured
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { phone, message, session = 'default' } = await req.json();

    if (!phone || !message) {
      throw new Error('Phone and message are required');
    }

    // Clean phone number (remove non-digits, ensure country code)
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("05")) {
      cleanPhone = "90" + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith("5")) {
      cleanPhone = "90" + cleanPhone;
    }

    // WAHA API expects the destination in JID format or just the number depending on the endpoint
    // We'll use the /api/sendText endpoint
    const wahaUrl = `${WAHA_API_URL}/api/sendText`;
    
    console.log(`Sending WhatsApp message to ${cleanPhone} via ${session} session...`);

    const response = await fetch(wahaUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // 'X-Api-Key': WAHA_API_KEY // Uncomment if needed
      },
      body: JSON.stringify({
        chatId: `${cleanPhone}@c.us`,
        text: message,
        session: session
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`WAHA API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('WhatsApp Notification Error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
