import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { platform, url } = await request.json()
    
    if (!platform || !url) {
      return NextResponse.json({ error: 'Platform and URL are required' }, { status: 400 })
    }

    let embedHtml = ''
    let trackInfo = null
    
    if (platform === 'spotify') {
      // Extract track ID from Spotify URL
      const spotifyMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/)
      if (spotifyMatch) {
        const trackId = spotifyMatch[1]
        
        // Create embedded Spotify player
        embedHtml = `
          <iframe 
            src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0"
            width="100%" 
            height="152" 
            frameBorder="0" 
            allowfullscreen="" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
            style="border-radius:12px"
          ></iframe>
        `
        
        trackInfo = {
          platform: 'spotify',
          trackId,
          title: 'Root of Evil',
          artist: 'Ras Dave',
          embedHtml
        }
      }
    } else if (platform === 'soundcloud') {
      // For SoundCloud, we need to get the actual track ID or use the direct URL
      // The SoundCloud embed API requires the track URL to be properly encoded
      const encodedUrl = encodeURIComponent(url)
      
      embedHtml = `
        <iframe 
          width="100%" 
          height="166" 
          scrolling="no" 
          frameBorder="no" 
          allow="autoplay"
          src="https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"
        ></iframe>
        <div style="font-size: 10px; color: #cccccc;line-break: anywhere;word-break: normal;overflow: hidden;white-space: nowrap;text-overflow: ellipsis; font-family: Interstate,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Garuda,Verdana,Tahoma,sans-serif;font-weight: 100;">
          <a href="https://soundcloud.com/rasdave1995" title="Ras Dave" target="_blank" style="color: #cccccc; text-decoration: none;">Ras Dave</a> · 
          <a href="${url}" title="Root of Evil" target="_blank" style="color: #cccccc; text-decoration: none;">Root of Evil</a>
        </div>
      `
      
      trackInfo = {
        platform: 'soundcloud',
        url,
        title: 'Root of Evil',
        artist: 'Ras Dave',
        embedHtml
      }
    }
    
    if (!trackInfo) {
      return NextResponse.json({ error: 'Could not parse URL or extract track information' }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      trackInfo,
      embedHtml,
      message: 'Embedded player generated successfully'
    })
    
  } catch (error) {
    console.error('Music streaming error:', error)
    return NextResponse.json({ 
      error: 'Failed to process music streaming request',
      details: error.message 
    }, { status: 500 })
  }
}