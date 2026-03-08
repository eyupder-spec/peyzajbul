const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL gerekli' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl bağlantısı yapılandırılmamış' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping company info from:', formattedUrl);

    // Use Firecrawl with JSON extraction
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: [
          {
            type: 'json',
            prompt: 'Extract company information from this website. Find: company name, phone number(s), email address(es), physical address, city, description/about text, and list of services they offer. Return in Turkish if available.',
            schema: {
              type: 'object',
              properties: {
                company_name: { type: 'string', description: 'Company name' },
                phone: { type: 'string', description: 'Primary phone number' },
                email: { type: 'string', description: 'Primary email address' },
                address: { type: 'string', description: 'Physical address' },
                city: { type: 'string', description: 'City name in Turkish' },
                description: { type: 'string', description: 'Company description or about text' },
                services: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of services the company offers',
                },
              },
            },
          },
        ],
        onlyMainContent: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `İstek başarısız: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the JSON data from the response
    const extracted = data?.data?.json || data?.json || null;

    if (!extracted) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firma bilgileri çıkarılamadı' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted company info:', extracted);

    return new Response(
      JSON.stringify({ success: true, company: extracted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
