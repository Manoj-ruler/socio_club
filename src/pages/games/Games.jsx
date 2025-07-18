"use client"
import { useState, useEffect, useRef } from "react"
import "./Games.css" // Import the CSS file

// Returns an English string if present; otherwise an empty string
const getEn = (field) => {
  if (!field) return ""
  if (typeof field === "string") return field
  if (typeof field === "object" && field !== null && "en" in field) {
    return field.en ?? ""
  }
  return ""
}

export default function GamesSection() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedGame, setSelectedGame] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [gamesPerPage] = useState(12)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const categoriesScrollRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch("https://pub.gamezop.com/v3/games?id=3443")
        if (!response.ok) {
          throw new Error("Failed to fetch games")
        }
        const data = await response.json()
        setGames(data.games || [])
      } catch (err) {
        setError("Failed to load games. Please try again later.")
        console.error("Error fetching games:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchGames()
  }, [])

  // Scroll to top when a game is selected
  useEffect(() => {
    if (selectedGame) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      })
    }
  }, [selectedGame])

  // Get unique categories
  const categories = Array.from(new Set(games.flatMap((game) => game.categories?.en || []))).sort()

  const searchTermLower = searchTerm.toLowerCase()
  const filteredGames = games.filter((game) => {
    const name = getEn(game.name)
    const desc = getEn(game.description)
    const gameCategories = game.categories?.en || []

    const matchesSearch =
      name.toLowerCase().includes(searchTermLower) ||
      desc.toLowerCase().includes(searchTermLower) ||
      gameCategories.some((cat) => cat.toLowerCase().includes(searchTermLower))

    const matchesCategory = selectedCategory === "all" || gameCategories.includes(selectedCategory)

    return matchesSearch && matchesCategory
  })

  const totalPages = Math.ceil(filteredGames.length / gamesPerPage)
  const startIndex = (currentPage - 1) * gamesPerPage
  const currentGames = filteredGames.slice(startIndex, startIndex + gamesPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory])

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  const handlePlayGame = (game) => {
    setSelectedGame(game)
  }

  const handleBackToGames = () => {
    setSelectedGame(null)
    // Scroll to top when going back to games list
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    })
  }

  const handleCategoryClick = (category) => {
    setSelectedCategory(category)
    setSearchTerm("")
  }

  const handleCategoryScroll = () => {
    const container = categoriesScrollRef.current
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0)
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth)
    }
  }

  const scrollCategories = (direction) => {
    const container = categoriesScrollRef.current
    if (container) {
      const scrollAmount = 200
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  useEffect(() => {
    const container = categoriesScrollRef.current
    if (container) {
      container.addEventListener("scroll", handleCategoryScroll)
      handleCategoryScroll() // Initial check
      return () => container.removeEventListener("scroll", handleCategoryScroll)
    }
  }, [categories]) // Re-run if categories change

  const handleFullscreenToggle = () => {
    const iframe = document.querySelector(".game-iframe-container iframe")

    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (iframe?.requestFullscreen) {
        iframe.requestFullscreen()
      } else if (iframe?.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen()
      } else if (iframe?.msRequestFullscreen) {
        iframe.msRequestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("msfullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("msfullscreenchange", handleFullscreenChange)
    }
  }, [])

  // UI for error
  if (error) {
    return (
      <div className="games-section">
        <div className="games-title">Oops! Something went wrong</div>
        <p style={{ color: "#fff", textAlign: "center" }}>{error}</p>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button className="games-search-btn" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Game Playing View
  if (selectedGame) {
    return (
      <div className="game-playing-view">
        {/* Header */}
        <div className="game-playing-header">
          <button className="games-search-btn" onClick={handleBackToGames}>
            ← Back to Games
          </button>
          <div className="game-info">
            <h1 className="game-title-bold">{getEn(selectedGame.name)}</h1>
            <p className="game-desc-center">{getEn(selectedGame.description)}</p>
          </div>
          <div className="game-meta-details">
            {selectedGame.rating && (
              <span>
                <span className="star-icon">★</span> {selectedGame.rating.toFixed(1)}
              </span>
            )}
            {selectedGame.gamePlays && (
              <span>
                <span className="users-icon">👥</span> {formatNumber(selectedGame.gamePlays)} plays
              </span>
            )}
          </div>
        </div>
        {/* Game Frame (now takes full width and proper height) */}
        <div className="game-content-area">
          <div className="game-iframe-container">
            <iframe
              src={selectedGame.url}
              title={getEn(selectedGame.name)}
              allowFullScreen
              allow="gamepad; microphone; camera"
            />
          </div>
          {/* Fullscreen Toggle Button */}
          <button
            className="fullscreen-toggle-btn"
            onClick={handleFullscreenToggle}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8 3V5H4V9H2V3H8ZM2 15V21H8V19H4V15H2ZM22 9V3H16V5H20V9H22ZM20 19H16V21H22V15H20V19Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M7 14H5V19H10V17H7V14ZM5 10H7V7H10V5H5V10ZM17 17H14V19H19V14H17V17ZM14 5V7H17V10H19V5H14Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Main Games List View
  return (
    <section className="games-section">
      <h1 className="games-title">Games</h1>
      <div className="games-search-bar">
        <input
          type="text"
          placeholder="Search games..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="games-search-input"
        />
        <button className="games-search-btn" onClick={() => setSearchTerm("")}>
          Clear
        </button>
      </div>

      <div className="games-categories-wrapper">
        <button
          onClick={() => scrollCategories("left")}
          className="scroll-button left"
          disabled={!canScrollLeft}
          aria-label="Scroll categories left"
        >
          ←
        </button>
        <div ref={categoriesScrollRef} className="games-categories" onScroll={handleCategoryScroll}>
          <button
            className={`games-category-btn${selectedCategory === "all" ? " active" : ""}`}
            onClick={() => handleCategoryClick("all")}
          >
            All Games ({games.length})
          </button>
          {categories.map((cat) => {
            const count = games.filter((game) => game.categories?.en?.includes(cat)).length
            return (
              <button
                key={cat}
                className={`games-category-btn${selectedCategory === cat ? " active" : ""}`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>
        <button
          onClick={() => scrollCategories("right")}
          className="scroll-button right"
          disabled={!canScrollRight}
          aria-label="Scroll categories right"
        >
          →
        </button>
        {canScrollLeft && <div className="gradient-overlay left" />}
        {canScrollRight && <div className="gradient-overlay right" />}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: " 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#fff", marginTop: 50 }}>Loading games...</div>
        ) : filteredGames.length === 0 ? (
          <div className="games-list-placeholder">
            <p>No games found. Try a different search or category.</p>
          </div>
        ) : (
          <div className="games-grid">
            {currentGames.map((game) => (
              <div key={game.id} className="game-card" onClick={() => handlePlayGame(game)}>
                <img
                  src={game.assets?.cover || "/placeholder.svg?height=200&width=300"}
                  alt={getEn(game.name)}
                  className="game-card-img"
                />
                <div className="game-card-content">
                  <h3 className="game-card-title">{getEn(game.name)}</h3>
                  <p className="game-card-desc">{getEn(game.description)}</p>
                  <div className="game-card-meta-row">
                    <div className="game-card-meta">
                      {game.rating && <span className="game-card-rating">★ {game.rating.toFixed(1)}</span>}
                      {game.gamePlays && <span className="game-card-plays">{formatNumber(game.gamePlays)} plays</span>}
                    </div>
                    <button
                      className="play-now-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlayGame(game)
                      }}
                    >
                      Play
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="games-pagination">
            <button
              className="games-pagination-btn"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              ← Prev
            </button>
            <span className="games-pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="games-pagination-btn"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
