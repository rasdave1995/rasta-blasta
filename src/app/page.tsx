'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface Soundwave {
  x: number
  y: number
  radius: number
  speed: number
  timestamp?: number
}

interface BankProjectile {
  x: number
  y: number
  width: number
  height: number
  speed: number
}

interface BankBuilding {
  x: number
  y: number
  width: number
  height: number
  health: number
  maxHealth: number
  lastShot: number
  direction: number // 1 for right, -1 for left
}

interface Player {
  x: number
  y: number
  width: number
  height: number
  health: number
  maxHealth: number
}

interface HighScore {
  initials: string
  score: number
  date: string
}

interface GameState {
  isPlaying: boolean
  score: number
  level: number
  gameOver: boolean
  showHighScores: boolean
  enteringInitials: boolean
}

export default function RetroArcadeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    score: 0,
    level: 1,
    gameOver: false,
    showHighScores: false,
    enteringInitials: false
  })
  const [player, setPlayer] = useState<Player>({ x: 400, y: 500, width: 40, height: 60, health: 100, maxHealth: 100 })
  const [soundwaves, setSoundwaves] = useState<Soundwave[]>([])
  const [bankProjectiles, setBankProjectiles] = useState<BankProjectile[]>([])
  const [bank, setBank] = useState<BankBuilding>({ 
    x: 250, 
    y: 30, 
    width: 300, 
    height: 200, 
    health: 300, 
    maxHealth: 300,
    lastShot: 0,
    direction: 1
  })
  const [taunts, setTaunts] = useState<string[]>([])
  const [currentTaunt, setCurrentTaunt] = useState<string>('')
  const [tauntInterval, setTauntInterval] = useState<NodeJS.Timeout | null>(null)
  const [keys, setKeys] = useState({ left: false, right: false, space: false })
  const [highScores, setHighScores] = useState<HighScore[]>([])
  const [playerInitials, setPlayerInitials] = useState<string>('')
  const [backgroundMusic, setBackgroundMusic] = useState<HTMLAudioElement | null>(null)
  
  // Audio context for sound effects
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // Initialize audio context on first user interaction
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.error('Failed to create audio context:', error)
      }
    }
    return audioContextRef.current
  }
  
  // Touch controls state
  const [touchControls, setTouchControls] = useState({
    left: false,
    right: false,
    shoot: false
  })
  
  // Refs for keyboard input to avoid dependency issues
  const gameStateRef = useRef(gameState)
  const playerInitialsRef = useRef(playerInitials)
  const keysRef = useRef(keys)
  const touchControlsRef = useRef(touchControls)
  const playerRef = useRef(player)
  const bankRef = useRef(bank)
  const soundwavesRef = useRef(soundwaves)
  const bankProjectilesRef = useRef(bankProjectiles)
  
  // Update refs when state changes
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])
  
  useEffect(() => {
    playerInitialsRef.current = playerInitials
  }, [playerInitials])
  
  useEffect(() => {
    keysRef.current = keys
  }, [keys])
  
  useEffect(() => {
    touchControlsRef.current = touchControls
  }, [touchControls])
  
  useEffect(() => {
    playerRef.current = player
  }, [player])
  
  useEffect(() => {
    bankRef.current = bank
  }, [bank])
  
  useEffect(() => {
    soundwavesRef.current = soundwaves
  }, [soundwaves])
  
  useEffect(() => {
    bankProjectilesRef.current = bankProjectiles
  }, [bankProjectiles])

  // Game constants
  const PLAYER_SPEED = 5
  const SOUNDWAVE_SPEED = 8
  const BANK_PROJECTILE_SPEED = 4
  const BANK_SHOOT_RATE = 1500 // milliseconds
  const BANK_MOVE_SPEED = 1 // Bank horizontal movement speed
  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 600
  
  // Responsive canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT })
  
  // Update canvas size based on screen size
  useEffect(() => {
    const updateCanvasSize = () => {
      const isMobile = window.innerWidth < 768
      if (isMobile) {
        const maxWidth = Math.min(window.innerWidth - 32, CANVAS_WIDTH) // 32px for padding
        const scale = maxWidth / CANVAS_WIDTH
        setCanvasSize({
          width: maxWidth,
          height: CANVAS_HEIGHT * scale
        })
      } else {
        setCanvasSize({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT })
      }
    }
    
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])
  
  // Touch control handlers
  const handleTouchStart = (control: 'left' | 'right' | 'shoot') => {
    setTouchControls(prev => ({ ...prev, [control]: true }))
    if (control === 'shoot' && gameStateRef.current.isPlaying) {
      playSound('shoot')
    }
  }
  
  const handleTouchEnd = (control: 'left' | 'right' | 'shoot') => {
    setTouchControls(prev => ({ ...prev, [control]: false }))
  }
  
  // Prevent scrolling when touching game controls
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      if (gameState.isPlaying) {
        e.preventDefault()
      }
    }
    
    document.addEventListener('touchmove', preventScroll, { passive: false })
    
    return () => {
      document.removeEventListener('touchmove', preventScroll)
    }
  }, [gameState.isPlaying])

  // Sound effects
  const playSound = (type: 'shoot' | 'hit' | 'explosion' | 'gameOver') => {
    try {
      const audioContext = initAudioContext()
      if (!audioContext) return
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      switch (type) {
        case 'shoot':
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1)
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.1)
          break
        case 'hit':
          oscillator.frequency.setValueAtTime(220, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.2)
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.2)
          break
        case 'explosion':
          oscillator.type = 'sawtooth'
          oscillator.frequency.setValueAtTime(100, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5)
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.5)
          break
        case 'gameOver':
          oscillator.frequency.setValueAtTime(330, audioContext.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(165, audioContext.currentTime + 0.8)
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.8)
          break
      }
    } catch (error) {
      // Silently fail if audio context is not supported
      console.error('Sound play error:', error)
    }
  }

  // High score management
  const loadHighScores = () => {
    try {
      const saved = localStorage.getItem('rastaBlastaHighScores')
      if (saved) {
        setHighScores(JSON.parse(saved))
      }
    } catch (error) {
      setHighScores([])
    }
  }

  const saveHighScore = (initials: string, score: number) => {
    const newScore: HighScore = {
      initials: initials.toUpperCase(),
      score,
      date: new Date().toLocaleDateString()
    }
    
    const updatedScores = [...highScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
    
    setHighScores(updatedScores)
    try {
      localStorage.setItem('rastaBlastaHighScores', JSON.stringify(updatedScores))
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  const checkHighScore = (score: number) => {
    console.log('Checking high score:', score, 'Current high scores:', highScores)
    // If we have less than 10 scores OR the score is higher than the lowest score
    if (highScores.length < 10 || score > (highScores[highScores.length - 1]?.score || 0)) {
      console.log('This is a high score!')
      return true
    }
    console.log('Not a high score')
    return false
  }

  // Initialize game
  const initGame = () => {
    // Initialize audio context on first game start
    initAudioContext()
    
    setGameState({
      isPlaying: true,
      score: 0,
      level: 1,
      gameOver: false,
      showHighScores: false,
      enteringInitials: false
    })
    setPlayer({ x: 400, y: 500, width: 40, height: 60, health: 100, maxHealth: 100 })
    setSoundwaves([])
    setBankProjectiles([])
    setBank({ 
      x: 250, 
      y: 30, 
      width: 300, 
      height: 200, 
      health: 300, 
      maxHealth: 300,
      lastShot: 0,
      direction: 1
    })
    setPlayerInitials('')
    generateTaunts()
    
    // Start background music on user interaction (game start)
    playBackgroundMusic()
    
    // Start taunt cycling
    startTauntCycle()
  }

  const showHighScores = () => {
    loadHighScores()
    setGameState(prev => ({ 
      ...prev, 
      showHighScores: true, 
      isPlaying: false, 
      enteringInitials: false 
    }))
  }

  // Load high scores on component mount
  useEffect(() => {
    loadHighScores()
    
    // Cleanup on component unmount
    return () => {
      stopTauntCycle()
    }
  }, [])

  // Background music play function - restore SoundCloud streaming
  const playBackgroundMusic = () => {
    // Clean up any existing music players
    document.querySelectorAll('.spotify-player, .soundcloud-player').forEach(el => {
      el.remove()
    })
    
    // Clear any existing fallback intervals
    if (window.fallbackMusicInterval) {
      clearInterval(window.fallbackMusicInterval)
    }
    
    if (window.currentAudio) {
      window.currentAudio.pause()
      window.currentAudio = null
    }
    
    console.log('🎵 Starting background music playback...')
    
    // Primary approach: SoundCloud (no popup)
    const playSoundCloud = () => {
      try {
        // Create hidden SoundCloud iframe
        const soundcloudIframe = document.createElement('iframe')
        soundcloudIframe.src = 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/rasdave1995/root-of-evil-1&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false'
        soundcloudIframe.style.cssText = `
          position: absolute;
          top: -9999px;
          left: -9999px;
          width: 1px;
          height: 1px;
          opacity: 0;
        `
        soundcloudIframe.allow = 'autoplay'
        soundcloudIframe.setAttribute('aria-hidden', 'true')
        
        document.body.appendChild(soundcloudIframe)
        console.log('✅ SoundCloud player started (hidden)')
        
        // Check if it's working after a delay
        setTimeout(() => {
          // If no audio context is active, try fallback
          if (!window.AudioContext && !(window as any).webkitAudioContext) {
            console.log('⚠️ SoundCloud may not be working, trying local MP3...')
            playLocalMP3()
          }
        }, 2000)
        
        return true
      } catch (error) {
        console.error('❌ SoundCloud failed:', error)
        playLocalMP3()
        return false
      }
    }
    
    // Fallback: Local MP3
    const playLocalMP3 = () => {
      try {
        const audio = new Audio('/root-of-evil.mp3')
        audio.loop = true
        audio.volume = 0.3
        
        const playPromise = audio.play()
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('✅ Playing local MP3 file')
            // Store audio reference for cleanup
            window.currentAudio = audio
          }).catch(error => {
            console.log('❌ Local MP3 failed:', error)
            // Silent fallback - no chiming sounds
          })
        }
      } catch (error) {
        console.error('❌ Local MP3 error:', error)
        // Silent fallback - no chiming sounds
      }
    }
    
    // Try SoundCloud first (primary choice - no popup!)
    playSoundCloud()
    
    // Store cleanup function
    window.cleanupMusic = () => {
      if (window.fallbackMusicInterval) {
        clearInterval(window.fallbackMusicInterval)
      }
      if (window.currentAudio) {
        window.currentAudio.pause()
        window.currentAudio = null
      }
      document.querySelectorAll('.spotify-player, .soundcloud-player').forEach(el => {
        el.remove()
      })
    }
  }

  // Set taunts (using the predefined list)
  const generateTaunts = async () => {
    // Use the predefined taunt list
    const gameTaunts = [
      "Your bass drops are weak!",
      "Jah can't help you now, Rastaman!",
      "We own the soundwaves, Rastaman!",
      "Sound can't crack steel vaults, dread!",
      "Keep jammin' — we still run di world!",
      "You chant freedom, we print money!",
      "We've got your soul in a loan agreement, star.",
      "Keep dreamin', Rasta. Babylon builds the system!",
      "You playing roots. We playing futures!",
      "Them soundwaves? Low frequency!"
    ]
    setTaunts(gameTaunts)
    startTauntCycle()
  }

  const showRandomTaunt = () => {
    if (taunts.length > 0) {
      const randomTaunt = taunts[Math.floor(Math.random() * taunts.length)]
      setCurrentTaunt(randomTaunt)
      setTimeout(() => setCurrentTaunt(''), 5000) // Show for 5 seconds
    }
  }

  // Start taunt cycling
  const startTauntCycle = () => {
    if (tauntInterval) {
      clearInterval(tauntInterval)
    }
    
    // Show first taunt immediately
    showRandomTaunt()
    
    // Then cycle every 10 seconds
    const interval = setInterval(() => {
      showRandomTaunt()
    }, 10000)
    
    setTauntInterval(interval)
  }

  // Stop taunt cycling
  const stopTauntCycle = () => {
    if (tauntInterval) {
      clearInterval(tauntInterval)
      setTauntInterval(null)
    }
    setCurrentTaunt('')
  }

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentGameState = gameStateRef.current
      const currentPlayerInitials = playerInitialsRef.current
      
      // Handle initials input globally (no need for canvas focus)
      if (currentGameState.enteringInitials) {
        console.log('Initials mode - Key pressed:', e.key, 'Current initials:', currentPlayerInitials)
        
        if (e.key === 'Enter' && currentPlayerInitials.length === 3) {
          console.log('Saving high score:', currentPlayerInitials, currentGameState.score)
          saveHighScore(currentPlayerInitials, currentGameState.score)
          setGameState(prev => ({ ...prev, enteringInitials: false, showHighScores: true }))
        } else if (e.key === 'Backspace') {
          console.log('Backspace pressed, initials:', currentPlayerInitials)
          setPlayerInitials(prev => prev.slice(0, -1))
        } else if (currentPlayerInitials.length < 3 && /^[A-Za-z]$/.test(e.key)) {
          console.log('Key pressed:', e.key, 'initials:', currentPlayerInitials)
          setPlayerInitials(prev => prev + e.key.toUpperCase())
        }
        return
      }

      // Only handle game controls if not entering initials
      if (e.key === 'ArrowLeft') {
        setKeys(prev => ({ ...prev, left: true }))
      }
      if (e.key === 'ArrowRight') {
        setKeys(prev => ({ ...prev, right: true }))
      }
      if (e.key === ' ') {
        setKeys(prev => ({ ...prev, space: true }))
        if (currentGameState.isPlaying) {
          playSound('shoot')
        }
      }
      if (e.key === 'h' || e.key === 'H') {
        if (!currentGameState.isPlaying && !currentGameState.enteringInitials) {
          if (currentGameState.showHighScores) {
            setGameState(prev => ({ ...prev, showHighScores: false }))
          } else {
            showHighScores()
          }
        }
      }
      if (e.key === 'Escape' || e.key === 'ESC') {
        if (currentGameState.showHighScores) {
          setGameState(prev => ({ ...prev, showHighScores: false }))
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setKeys(prev => ({ ...prev, left: false }))
      if (e.key === 'ArrowRight') setKeys(prev => ({ ...prev, right: false }))
      if (e.key === ' ') setKeys(prev => ({ ...prev, space: false }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, []) // Empty dependency array - event listener is set up once

  // Game loop
  useEffect(() => {
    if (!gameState.isPlaying) return

    const gameLoop = setInterval(() => {
      // Update player position (support both keyboard and touch controls)
      setPlayer(prev => {
        let newX = prev.x
        const keys = keysRef.current
        const touch = touchControlsRef.current
        
        if ((keys.left || touch.left) && newX > 0) newX -= PLAYER_SPEED
        if ((keys.right || touch.right) && newX < CANVAS_WIDTH - prev.width) newX += PLAYER_SPEED
        return { ...prev, x: newX }
      })

      // Update bank position (side to side movement)
      setBank(prev => {
        let newX = prev.x + (BANK_MOVE_SPEED * prev.direction)
        let newDirection = prev.direction
        
        // Reverse direction if hitting canvas edges
        if (newX <= 0) {
          newX = 0
          newDirection = 1
        } else if (newX >= CANVAS_WIDTH - prev.width) {
          newX = CANVAS_WIDTH - prev.width
          newDirection = -1
        }
        
        return { ...prev, x: newX, direction: newDirection }
      })

      // Shoot soundwaves (support both keyboard and touch controls)
      if (keysRef.current.space || touchControlsRef.current.shoot) {
        setSoundwaves(prev => {
          const lastWave = prev[prev.length - 1]
          // Limit shooting rate
          if (!lastWave || Date.now() - (lastWave as any).timestamp > 250) {
            return [...prev, { 
              x: playerRef.current.x + playerRef.current.width / 2, 
              y: playerRef.current.y, 
              radius: 5, 
              speed: SOUNDWAVE_SPEED,
              timestamp: Date.now() as any
            }]
          }
          return prev
        })
      }

      // Update soundwaves
      setSoundwaves(prev => 
        prev
          .map(wave => ({ ...wave, y: wave.y - wave.speed }))
          .filter(wave => wave.y > -wave.radius)
      )

      // Bank shooting logic
      const now = Date.now()
      if (bankRef.current.health > 0 && now - bankRef.current.lastShot > BANK_SHOOT_RATE) {
        setBank(prev => ({ ...prev, lastShot: now }))
        
        // Shoot multiple projectiles from different parts of the bank
        const projectileCount = Math.min(3, 1 + Math.floor(gameStateRef.current.level / 2))
        const newProjectiles: BankProjectile[] = []
        
        for (let i = 0; i < projectileCount; i++) {
          const xOffset = (bankRef.current.width / (projectileCount + 1)) * (i + 1)
          newProjectiles.push({
            x: bankRef.current.x + xOffset - 5,
            y: bankRef.current.y + bankRef.current.height,
            width: 10,
            height: 20,
            speed: BANK_PROJECTILE_SPEED + (gameStateRef.current.level * 0.5)
          })
        }
        
        setBankProjectiles(prev => [...prev, ...newProjectiles])
      }

      // Update bank projectiles
      setBankProjectiles(prev => 
        prev
          .map(proj => ({ ...proj, y: proj.y + proj.speed }))
          .filter(proj => proj.y < CANVAS_HEIGHT)
      )

      // Check collisions
      setSoundwaves(prev => {
        const remainingWaves = prev.filter(wave => {
          const hit = wave.x > bankRef.current.x && 
                      wave.x < bankRef.current.x + bankRef.current.width &&
                      wave.y > bankRef.current.y && 
                      wave.y < bankRef.current.y + bankRef.current.height
          
          if (hit) {
            playSound('hit')
            setBank(prevBank => {
              const newHealth = Math.max(0, prevBank.health - 10)
              if (newHealth === 0) {
                // Bank destroyed
                playSound('explosion')
                setGameState(prevState => ({
                  ...prevState,
                  score: prevState.score + 1000,
                  level: prevState.level + 1
                }))
                // Reset bank with more health
                setTimeout(() => {
                  setBank({
                    x: Math.random() * (CANVAS_WIDTH - 300),
                    y: 30,
                    width: 300,
                    height: 200,
                    health: 300 + ((gameStateRef.current.level + 1) * 50),
                    maxHealth: 300 + ((gameStateRef.current.level + 1) * 50),
                    lastShot: 0,
                    direction: Math.random() > 0.5 ? 1 : -1
                  })
                  setBankProjectiles([])
                  // Taunt will be shown by the cycling system
                }, 1000)
                return { ...prevBank, health: 0 }
              }
              return { ...prevBank, health: newHealth }
            })
            setGameState(prev => ({ ...prev, score: prev.score + 10 }))
            return false
          }
          return true
        })
        return remainingWaves
      })

      // Check bank projectile collisions with player
      setBankProjectiles(prev => {
        const remainingProjectiles = prev.filter(proj => {
          const hit = proj.x < playerRef.current.x + playerRef.current.width &&
                      proj.x + proj.width > playerRef.current.x &&
                      proj.y < playerRef.current.y + playerRef.current.height &&
                      proj.y + proj.height > playerRef.current.y
          
          if (hit) {
            playSound('hit')
            setPlayer(prevPlayer => {
              const newHealth = Math.max(0, prevPlayer.health - 20)
              if (newHealth === 0) {
                // Player destroyed
                playSound('gameOver')
                const isHighScore = checkHighScore(gameStateRef.current.score)
                console.log('Game Over - High Score?', isHighScore, 'Score:', gameStateRef.current.score)
                setGameState(prevState => ({
                  ...prevState,
                  gameOver: true,
                  isPlaying: false,
                  enteringInitials: isHighScore
                }))
                // Stop taunt cycling when game ends
                stopTauntCycle()
              }
              return { ...prevPlayer, health: newHealth }
            })
            return false
          }
          return true
        })
        return remainingProjectiles
      })

    }, 16) // ~60 FPS

    return () => clearInterval(gameLoop)
  }, [gameState.isPlaying])

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#000011'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    if (!gameState.isPlaying) {
      // Draw start screen
      ctx.font = '48px monospace'
      ctx.textAlign = 'center'
      
      if (gameState.enteringInitials) {
        console.log('Drawing initials input screen - initials:', playerInitials)
        ctx.fillStyle = '#ffff00'
        ctx.fillText('HIGH SCORE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80)
        ctx.fillStyle = '#00ff00'
        ctx.font = '32px monospace'
        ctx.fillText(`Score: ${gameState.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20)
        ctx.fillStyle = '#ff0000'
        ctx.font = '24px monospace'
        ctx.fillText('Enter Initials:', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20)
        ctx.fillStyle = '#ffff00'
        ctx.font = '48px monospace' // Even larger for better visibility
        ctx.fillText(`${playerInitials}_`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80)
        ctx.fillStyle = '#00ff00'
        ctx.font = '16px monospace'
        ctx.fillText('Press ENTER when done', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120)
        ctx.fillText('Use BACKSPACE to delete', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 140)
        ctx.fillText('Click here and type!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 160)
      } else if (gameState.showHighScores) {
        ctx.fillStyle = '#ffff00'
        ctx.fillText('HIGH SCORES', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 120)
        ctx.font = '20px monospace'
        ctx.fillStyle = '#00ff00'
        highScores.forEach((score, index) => {
          const y = CANVAS_HEIGHT / 2 - 60 + (index * 25)
          const rankColor = index < 3 ? '#ff0000' : '#00ff00'
          ctx.fillStyle = rankColor
          ctx.fillText(`${index + 1}. ${score.initials} - ${score.score}`, CANVAS_WIDTH / 2, y)
        })
        ctx.fillStyle = '#ffff00'
        ctx.font = '16px monospace'
        ctx.fillText('Press START to play', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 200)
        ctx.fillText('Press H or ESC for main menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 225)
      } else if (gameState.gameOver) {
        ctx.fillStyle = '#ff0000'
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80)
        ctx.fillStyle = '#ffff00'
        ctx.font = '32px monospace'
        ctx.fillText(`Final Score: ${gameState.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20)
        ctx.fillStyle = '#00ff00'
        ctx.font = '24px monospace'
        ctx.fillText('Press START to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40)
        ctx.fillText('Press H for high scores', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80)
      } else {
        // RASTA BLASTA with colors
        ctx.fillStyle = '#00ff00'  // Green for RASTA
        ctx.fillText('RASTA', CANVAS_WIDTH / 2 - 80, CANVAS_HEIGHT / 2 - 50)
        ctx.fillStyle = '#ffff00'  // Yellow for BLASTA
        ctx.fillText('BLASTA', CANVAS_WIDTH / 2 + 40, CANVAS_HEIGHT / 2 - 50)
        
        ctx.font = '24px monospace'
        ctx.fillStyle = '#ff0000'  // Red for instructions
        ctx.fillText('Press START to begin', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20)
        ctx.font = '16px monospace'
        ctx.fillText('Use Arrow Keys to move, Space to shoot', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60)
        ctx.fillText('Press H for high scores', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 90)
      }
      return
    }

    // Draw player (Speaker Box)
    ctx.fillStyle = player.health > 30 ? '#333333' : '#666666'
    ctx.fillRect(player.x, player.y, player.width, player.height)
    
    // Draw speaker cone
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.moveTo(player.x + player.width, player.y + player.height / 2)
    ctx.lineTo(player.x + player.width + 15, player.y + player.height / 2 - 10)
    ctx.lineTo(player.x + player.width + 15, player.y + player.height / 2 + 10)
    ctx.closePath()
    ctx.fill()
    
    // Draw speaker details
    ctx.fillStyle = '#666666'
    ctx.beginPath()
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 8, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = '#888888'
    ctx.beginPath()
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 5, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw sound waves coming from speaker
    if (keysRef.current.space) {
      ctx.strokeStyle = '#00ffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 15, 0, Math.PI * 2)
      ctx.stroke()
      
      ctx.strokeStyle = '#0099ff'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 20, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    // Draw player health bar
    const playerHealthBarWidth = player.width
    const playerHealthPercentage = player.health / player.maxHealth
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(player.x, player.y - 10, playerHealthBarWidth, 5)
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(player.x, player.y - 10, playerHealthBarWidth * playerHealthPercentage, 5)
    
    // Draw soundwaves
    soundwaves.forEach(wave => {
      ctx.strokeStyle = '#00ffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2)
      ctx.stroke()
      
      // Draw soundwave rings
      ctx.strokeStyle = '#0099ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(wave.x, wave.y, wave.radius + 5, 0, Math.PI * 2)
      ctx.stroke()
    })

    // Draw bank building
    if (bank.health > 0) {
      // Main building
      ctx.fillStyle = '#444444'
      ctx.fillRect(bank.x, bank.y, bank.width, bank.height)
      
      // Bank details - windows
      ctx.fillStyle = '#ffff00'
      const windowSize = 15
      const windowSpacing = 25
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < Math.floor(bank.width / windowSpacing) - 1; col++) {
          if (Math.random() > 0.3) { // Random broken windows
            ctx.fillRect(
              bank.x + 15 + col * windowSpacing, 
              bank.y + 20 + row * windowSpacing, 
              windowSize, 
              windowSize
            )
          }
        }
      }
      
      // Bank entrance
      ctx.fillStyle = '#333333'
      ctx.fillRect(bank.x + bank.width/2 - 30, bank.y + bank.height - 40, 60, 40)
      
      // Bank sign
      ctx.fillStyle = '#ffff00'
      ctx.font = 'bold 24px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('EVIL BANK', bank.x + bank.width / 2, bank.y + 25)
      ctx.font = '14px monospace'
      ctx.fillText('$$$', bank.x + bank.width / 2, bank.y + 45)
      
      // Draw health bar
      const healthBarWidth = bank.width
      const healthPercentage = bank.health / bank.maxHealth
      ctx.fillStyle = '#ff0000'
      ctx.fillRect(bank.x, bank.y - 15, healthBarWidth, 8)
      ctx.fillStyle = '#00ff00'
      ctx.fillRect(bank.x, bank.y - 15, healthBarWidth * healthPercentage, 8)
    }

    // Draw bank projectiles
    bankProjectiles.forEach(proj => {
      ctx.fillStyle = '#ff4444'
      ctx.fillRect(proj.x, proj.y, proj.width, proj.height)
      
      // Add glow effect
      ctx.shadowColor = '#ff0000'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#ff8888'
      ctx.fillRect(proj.x + 2, proj.y + 2, proj.width - 4, proj.height - 4)
      ctx.shadowBlur = 0
    })

    // Draw UI
    ctx.fillStyle = '#00ff00'
    ctx.font = '20px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${gameState.score}`, 10, 30)
    ctx.fillText(`Level: ${gameState.level}`, 10, 55)
    ctx.fillText(`Health: ${player.health}/${player.maxHealth}`, 10, 80)

    // Draw taunt
    if (currentTaunt) {
      ctx.fillStyle = '#ff0066'
      ctx.font = '24px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(currentTaunt, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30)
    }

  }, [gameState, currentTaunt, player, bank, soundwaves, bankProjectiles])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-2 md:p-4">
      <style jsx>{`
        /* Prevent zoom on double tap */
        * {
          touch-action: manipulation;
        }
        
        /* Improve touch button feedback */
        .touch-button {
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        /* Prevent text selection on touch devices */
        .no-select {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>
      <div className="mb-2 md:mb-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-1 md:mb-2 font-mono">
          <span className="text-green-400">RASTA</span>
          <span className="text-yellow-400">BLASTA</span>
        </h1>
        <p className="text-red-400 text-center font-mono text-sm md:text-base">
          Destroy the babylon system with reggae sound waves!
        </p>
        <p className="text-yellow-400 text-center font-mono text-xs md:text-sm mt-1 md:mt-2">
          Controls: ← → Arrow Keys to Move | Spacebar to Shoot | H for High Scores
        </p>
        <p className="text-green-400 text-center font-mono text-xs mt-1 md:hidden">
          Mobile: Use touch buttons below when playing
        </p>
      </div>
      
      {/* Game UI Elements - hidden when game is playing */}
      {!gameState.isPlaying && (
        <>
          {/* Start Game Button - moved outside canvas */}
          <div className="mb-2 md:mb-4">
            <Button 
              onClick={initGame}
              className="bg-green-500 hover:bg-green-600 text-black font-bold text-lg md:text-xl px-6 md:px-8 py-3 md:py-4 font-mono w-full md:w-auto"
            >
              {gameState.gameOver ? 'PLAY AGAIN' : 'START GAME'}
            </Button>
          </div>
          
          {/* Cover Image */}
          <div className="mb-2 md:mb-4">
            <img 
              src="https://i.imgur.com/VCBfSkj.jpeg" 
              alt="RASTA BLASTA Game Poster" 
              className="max-w-xs md:max-w-md rounded-lg border-4 border-yellow-400 w-full"
            />
          </div>
          
          {/* High Scores Button - moved below image */}
          <div className="mb-2 md:mb-4">
            <Button 
              onClick={showHighScores}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg md:text-xl px-6 md:px-8 py-3 md:py-4 font-mono w-full md:w-auto"
            >
              HIGH SCORES
            </Button>
          </div>
        </>
      )}
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ 
            width: `${canvasSize.width}px`, 
            height: `${canvasSize.height}px`,
            maxWidth: '100%',
            height: 'auto'
          }}
          className="border-4 border-green-400 bg-black cursor-pointer"
          onClick={() => {
            if (!gameState.isPlaying) {
              playBackgroundMusic()
            }
          }}
        />
        
        {!gameState.isPlaying && !gameState.enteringInitials && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 gap-4">
            {gameState.showHighScores ? (
              <>
                <Button 
                  onClick={() => setGameState(prev => ({ ...prev, showHighScores: false }))}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold text-xl px-8 py-4 font-mono"
                >
                  BACK TO MENU
                </Button>
                <Button 
                  onClick={initGame}
                  className="bg-green-500 hover:bg-green-600 text-black font-bold text-xl px-8 py-4 font-mono"
                >
                  START GAME
                </Button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-white text-xl font-mono mb-4">Click START GAME above to begin!</p>
                <p className="text-yellow-400 font-mono">Or view HIGH SCORES below</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Touch Controls - only visible on mobile when game is playing */}
      {gameState.isPlaying && (
        <div className="mt-2 md:mt-4 flex flex-col items-center gap-3 md:hidden">
          <div className="flex gap-3">
            {/* Left Button */}
            <button
              onTouchStart={() => handleTouchStart('left')}
              onTouchEnd={() => handleTouchEnd('left')}
              onMouseDown={() => handleTouchStart('left')}
              onMouseUp={() => handleTouchEnd('left')}
              onMouseLeave={() => handleTouchEnd('left')}
              className={`touch-button no-select w-16 h-16 md:w-20 md:h-20 rounded-full border-4 ${
                touchControls.left 
                  ? 'bg-green-500 border-green-300' 
                  : 'bg-gray-800 border-green-400'
              } flex items-center justify-center text-white font-bold text-xl md:text-2xl`}
            >
              ←
            </button>
            
            {/* Right Button */}
            <button
              onTouchStart={() => handleTouchStart('right')}
              onTouchEnd={() => handleTouchEnd('right')}
              onMouseDown={() => handleTouchStart('right')}
              onMouseUp={() => handleTouchEnd('right')}
              onMouseLeave={() => handleTouchEnd('right')}
              className={`touch-button no-select w-16 h-16 md:w-20 md:h-20 rounded-full border-4 ${
                touchControls.right 
                  ? 'bg-green-500 border-green-300' 
                  : 'bg-gray-800 border-green-400'
              } flex items-center justify-center text-white font-bold text-xl md:text-2xl`}
            >
              →
            </button>
          </div>
          
          {/* Shoot Button */}
          <button
            onTouchStart={() => handleTouchStart('shoot')}
            onTouchEnd={() => handleTouchEnd('shoot')}
            onMouseDown={() => handleTouchStart('shoot')}
            onMouseUp={() => handleTouchEnd('shoot')}
            onMouseLeave={() => handleTouchEnd('shoot')}
            className={`touch-button no-select w-20 h-20 md:w-24 md:h-24 rounded-full border-4 ${
              touchControls.shoot 
                ? 'bg-red-500 border-red-300' 
                : 'bg-gray-800 border-red-400'
            } flex items-center justify-center text-white font-bold text-lg md:text-xl`}
          >
            🔥
          </button>
          
          <p className="text-yellow-400 text-center font-mono text-xs">
            Touch controls: Use ← → to move, 🔥 to shoot
          </p>
        </div>
      )}
      
      {/* Music Button at Bottom */}
      <div className="mt-2 md:mt-4">
        <Button 
          onClick={playBackgroundMusic}
          className="bg-green-600 hover:bg-green-700 text-white px-4 md:px-6 py-2 md:py-3 font-mono text-sm md:text-lg flex items-center gap-2 w-full md:w-auto"
        >
          🎵 Play "Root of Evil" Music
        </Button>
        <p className="text-yellow-400 text-center font-mono text-xs md:text-sm mt-1 md:mt-2">
          Click this button to start the background music
        </p>
      </div>
    </div>
  )
}