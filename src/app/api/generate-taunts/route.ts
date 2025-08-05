import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { count = 10 } = await request.json()
    
    const zai = await ZAI.create()
    
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a corrupt, evil bank building in a retro arcade game. Generate taunting phrases that a bank would say to a Rastaman character who is shooting soundwaves at you. Make the taunts:
          - Short and punchy (under 15 words)
          - Arrogant and dismissive
          - Related to money, banking, or corruption
          - In the style of 1980s arcade game villains
          - Slightly humorous but menacing
          
          Return exactly ${count} taunts as a JSON array of strings.`
        },
        {
          role: 'user',
          content: `Generate ${count} taunts for a corrupt bank building in a retro arcade game.`
        }
      ],
      temperature: 0.8,
      max_tokens: 500
    })

    let taunts: string[] = []
    
    try {
      const content = completion.choices[0]?.message?.content || ''
      // Try to parse as JSON first
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        taunts = parsed
      } else {
        // If not JSON, split by newlines and clean up
        taunts = content.split('\n')
          .map(line => line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim())
          .filter(line => line.length > 0)
      }
    } catch (parseError) {
      // Fallback: split by newlines and clean up
      const content = completion.choices[0]?.message?.content || ''
      taunts = content.split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter(line => line.length > 0)
    }

    // Ensure we have enough taunts
    if (taunts.length < count) {
      const fallbackTaunts = [
        "Your soundwaves are weak!",
        "The bank laughs at your efforts!",
        "You can't touch our money!",
        "Give up, Rastaman!",
        "Our vault is impenetrable!",
        "Money talks, soundwaves walk!",
        "Your reggae beats can't stop our greed!",
        "We own the system, you own nothing!",
        "Try harder, little Rastaman!",
        "Your waves are just noise to us!"
      ]
      taunts = [...taunts, ...fallbackTaunts.slice(0, count - taunts.length)]
    }

    return NextResponse.json({ taunts: taunts.slice(0, count) })
  } catch (error) {
    console.error('Error generating taunts:', error)
    
    // Fallback taunts
    const fallbackTaunts = [
      "Your soundwaves are weak!",
      "The bank laughs at your efforts!",
      "You can't touch our money!",
      "Give up, Rastaman!",
      "Our vault is impenetrable!",
      "Money talks, soundwaves walk!",
      "Your reggae beats can't stop our greed!",
      "We own the system, you own nothing!",
      "Try harder, little Rastaman!",
      "Your waves are just noise to us!"
    ]
    
    return NextResponse.json({ taunts: fallbackTaunts })
  }
}