"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import "./News.css"

// Category-specific colors for placeholders
const categoryColors = {
  india: ["#FF6B35", "#F7931E"],
  entertainment: ["#9B59B6", "#8E44AD"],
  viral: ["#E74C3C", "#C0392B"],
  business: ["#2ECC71", "#27AE60"],
  tech: ["#3498DB", "#2980B9"],
  world: ["#34495E", "#2C3E50"],
  "web-stories": ["#F39C12", "#E67E22"],
  lifestyle: ["#E91E63", "#AD1457"],
  politics: ["#795548", "#5D4037"],
  movies: ["#673AB7", "#512DA8"],
  "top-stories": ["#607D8B", "#455A64"],
  default: ["#333333", "#111111"],
}

// Generate placeholder image as data URL
const generatePlaceholderImage = (width = 600, height = 400, category = "default") => {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  const colors = categoryColors[category] || categoryColors.default

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, colors[0])
  gradient.addColorStop(1, colors[1])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Add subtle pattern
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
  for (let i = 0; i < width; i += 20) {
    for (let j = 0; j < height; j += 20) {
      if ((i + j) % 40 === 0) {
        ctx.fillRect(i, j, 2, 2)
      }
    }
  }

  // Add text
  ctx.fillStyle = "#ffffff"
  ctx.font = "bold 24px Arial"
  ctx.textAlign = "center"
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
  ctx.shadowBlur = 4
  ctx.fillText("📰", width / 2, height / 2 - 20)
  ctx.font = "16px Arial"
  ctx.fillText("Loading Image...", width / 2, height / 2 + 10)
  ctx.font = "12px Arial"
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
  ctx.fillText(`${width} × ${height}`, width / 2, height / 2 + 30)

  return canvas.toDataURL()
}

// Enhanced helper function to extract images from content
const extractImageFromContent = (content, title = "") => {
  if (!content) return null;

  // Prioritize high-quality images from specific tags
  let doc = new DOMParser().parseFromString(content, "text/html");
  let img = doc.querySelector("img");
  if (img && img.src) return img.src;

  // Fallback to regex for more complex cases
  const patterns = [
    /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
    /https?:\/\/[^"\s<>]*\.(?:jpg|jpeg|png|gif|webp)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

const NewsSection = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("india")
  const [visibleItems, setVisibleItems] = useState(10)
  const [lastFetchTime, setLastFetchTime] = useState({}) // Track last fetch time per category

  // Enhanced caching with much shorter duration for fresh data
  const newsCacheRef = useRef({})
  const cacheTimestampsRef = useRef({})
  const imageCacheRef = useRef({})
  const fetchingRef = useRef(new Set())
  const fetchNewsRef = useRef()
  const observerRef = useRef(null)

  // Track which category is currently being displayed
  const currentDisplayCategoryRef = useRef("india")

  // FIXED: Much shorter cache duration to ensure fresh data
  const CACHE_DURATION = 2 * 60 * 1000 // Only 2 minutes cache
  const FORCE_REFRESH_INTERVAL = 5 * 60 * 1000 // Force refresh every 5 minutes
  const LOAD_INCREMENT = 10

  // Default placeholder
  const [defaultPlaceholder, setDefaultPlaceholder] = useState("")

  useEffect(() => {
    if (typeof document !== "undefined") {
      setDefaultPlaceholder(generatePlaceholderImage(600, 400, "default"))
      // REMOVED: No more persistent cache loading - always fetch fresh
      console.log("🚀 Starting fresh - no persistent cache loaded")
    }
  }, [])

  // Categories with optimized order (most popular first)
  const categories = {
    india: {
      name: "India",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/india.xml",
    },
    entertainment: {
      name: "Entertainment",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/entertainment.xml",
    },
    viral: {
      name: "Viral",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/viral.xml",
    },
    business: {
      name: "Business",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/business.xml",
    },
    tech: {
      name: "Tech",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/tech.xml",
    },
    world: {
      name: "World",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/world.xml",
    },
    "top-stories": {
      name: "Top Stories",
      url: "https://feeds.bbci.co.uk/news/rss.xml",
    },
    "web-stories": {
      name: "Web Stories",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/web-stories.xml",
    },
    lifestyle: {
      name: "Lifestyle",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/lifestyle-2.xml",
    },
    politics: {
      name: "Politics",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/politics.xml",
    },
    movies: {
      name: "Movies",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/movies.xml",
    },
    cricket: {
      name: "Cricket",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/cricket.xml",
    },
    sports: {
      name: "Sports",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/sports.xml",
    },
    explainers: {
      name: "Explainers",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/explainers.xml",
    },
    elections: {
      name: "Elections",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/elections.xml",
    },
    astrology: {
      name: "Astrology",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/astrology.xml",
    },
    education: {
      name: "Education-Career",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/education-career.xml",
    },
    auto: {
      name: "Auto",
      url: "https://www.news18.com/commonfeeds/v1/eng/rss/auto.xml",
    },
  }

  // FIXED: Enhanced cache validation with force refresh logic
  const isCacheValid = useCallback(
    (category) => {
      const timestamp = cacheTimestampsRef.current[category]
      const lastFetch = lastFetchTime[category]

      // If no timestamp, cache is invalid
      if (!timestamp) return false

      // If cache is older than CACHE_DURATION, invalid
      if (Date.now() - timestamp > CACHE_DURATION) return false

      // If last fetch was more than FORCE_REFRESH_INTERVAL ago, force refresh
      if (lastFetch && Date.now() - lastFetch > FORCE_REFRESH_INTERVAL) return false

      return true
    },
    [lastFetchTime],
  )

  // REMOVED: No more persistent cache functions - always fetch fresh

  // Enhanced fetch with cache-busting and fresh data priority
  const fetchWithOptimizedProxy = async (url, retries = 3) => {
    // Add cache-busting parameter to ensure fresh data
    const cacheBuster = `?_t=${Date.now()}&_r=${Math.random()}`
    const urlWithCacheBuster = url + (url.includes("?") ? "&" : "?") + `_t=${Date.now()}&_r=${Math.random()}`

    // Different proxy strategies for different feeds
    const isNews18Feed = url.includes("news18.com")
    const isBBCFeed = url.includes("bbci.co.uk")

    let proxyMethods = []

    if (isNews18Feed) {
      // Optimized for News18 feeds with cache busting
      proxyMethods = [
        () => fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(urlWithCacheBuster)}`),
        () => fetch(`https://corsproxy.io/?${encodeURIComponent(urlWithCacheBuster)}`),
        () => fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(urlWithCacheBuster)}`),
        () => fetch(`https://thingproxy.freeboard.io/fetch/${urlWithCacheBuster}`),
        () => fetch(`https://proxy.cors.sh/${urlWithCacheBuster}`),
      ]
    } else if (isBBCFeed) {
      // Optimized for BBC feeds with cache busting
      proxyMethods = [
        () => fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(urlWithCacheBuster)}`),
        () => fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(urlWithCacheBuster)}`),
        () => fetch(`https://corsproxy.io/?${encodeURIComponent(urlWithCacheBuster)}`),
      ]
    } else {
      // General proxy methods with cache busting
      proxyMethods = [
        () => fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(urlWithCacheBuster)}`),
        () => fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(urlWithCacheBuster)}`),
        () => fetch(`https://corsproxy.io/?${encodeURIComponent(urlWithCacheBuster)}`),
        () => fetch(`https://thingproxy.freeboard.io/fetch/${urlWithCacheBuster}`),
      ]
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt + 1} for ${url} (with cache busting)`)

        const promises = proxyMethods.map(async (method, index) => {
          try {
            const response = await method()
            if (!response.ok) throw new Error(`Method ${index + 1} failed with status ${response.status}`)

            if (index === 0 && isNews18Feed) {
              // AllOrigins for News18
              const data = await response.json()
              return { data: data.contents, type: "xml", method: index + 1 }
            } else if ((index === 0 && isBBCFeed) || (index === 2 && isNews18Feed)) {
              // RSS2JSON
              const data = await response.json()
              if (data.status !== "ok") throw new Error("RSS2JSON error")
              return { data, type: "json", method: index + 1 }
            } else if (index === 1) {
              // AllOrigins
              const data = await response.json()
              return { data: data.contents, type: "xml", method: index + 1 }
            } else {
              // Other proxies
              const data = await response.text()
              return { data, type: "xml", method: index + 1 }
            }
          } catch (error) {
            throw new Error(`Proxy method ${index + 1} failed: ${error.message}`)
          }
        })

        const result = await Promise.any(promises)
        console.log(`✅ Proxy method ${result.method} succeeded for ${url} (attempt ${attempt + 1}) - FRESH DATA`)
        return result
      } catch (error) {
        console.log(`❌ All proxy methods failed for attempt ${attempt + 1}: ${error.message}`)
        if (attempt === retries) {
          throw new Error(`All proxy methods failed after ${retries + 1} attempts`)
        }
        console.log(`⏳ Waiting before retry...`)
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1))) // Exponential backoff
      }
    }
  }

  // MODIFIED: Enhanced RSS parsing with better image extraction
  const parseRSSData = (result, category) => {
    let items = []
    const categoryPlaceholder = generatePlaceholderImage(600, 400, category)

    if (result.type === "json") {
      // Limit to first 10 items only for consistency
      items = result.data.items.slice(0, 10).map((item, idx) => {
        // Enhanced image extraction for JSON format
        let actualImageUrl = null

        // Try multiple sources for images
        if (item.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.length > 0) {
          actualImageUrl = item.thumbnail
        } else if (item.enclosure && item.enclosure.link) {
          actualImageUrl = item.enclosure.link
        } else if (item.content) {
          actualImageUrl = extractImageFromContent(item.content, item.title)
        } else if (item.description) {
          actualImageUrl = extractImageFromContent(item.description, item.title)
        }

        return {
          id: `${category}-${idx + 1}-${Date.now()}`,
          title: item.title || "Untitled",
          description: (item.description || "").replace(/<[^>]*>/g, "").substring(0, 200) + "...",
          link: item.link || "#",
          pubDate: item.pubDate || new Date().toISOString(),
          author: item.author || "Unknown",
          thumbnail: categoryPlaceholder,
          actualImageUrl,
          imageLoaded: false,
          fetchTime: Date.now(),
        }
      })
    } else {
      // Parse XML and get only first 10 items
      const xml = new DOMParser().parseFromString(result.data, "text/xml")
      const parseError = xml.querySelector("parsererror")
      if (parseError) {
        throw new Error("Failed to parse RSS XML")
      }

      const allItems = Array.from(xml.querySelectorAll("item")).slice(0, 10)

      items = allItems.map((item, idx) => {
        const title = item.querySelector("title")?.textContent || "Untitled";
        let actualImageUrl = null;

        // 1. Media RSS: Check for <media:thumbnail> (highest priority)
        const mediaThumbnail = item.querySelector("media\\:thumbnail, thumbnail");
        if (mediaThumbnail) {
          actualImageUrl = mediaThumbnail.getAttribute("url");
        }

        // 2. Media RSS: Check for <media:content> if thumbnail not found
        if (!actualImageUrl) {
          const mediaContent = item.querySelector("media\\:content, content");
          if (mediaContent && (!mediaContent.getAttribute('medium') || mediaContent.getAttribute('medium') === 'image')) {
            actualImageUrl = mediaContent.getAttribute("url");
          }
        }

        // 3. Standard RSS: Check for <enclosure> with an image type
        if (!actualImageUrl) {
          const enclosure = item.querySelector("enclosure");
          if (enclosure && enclosure.getAttribute("type") && enclosure.getAttribute("type").startsWith("image")) {
            actualImageUrl = enclosure.getAttribute("url");
          }
        }

        // 4. iTunes Namespace: Check for <itunes:image>
        if (!actualImageUrl) {
          const itunesImage = item.querySelector("itunes\\:image, image");
          if (itunesImage) {
            actualImageUrl = itunesImage.getAttribute("href");
          }
        }

        // 5. Fallback: Extract from <content:encoded> or <description>
        if (!actualImageUrl) {
          const content = item.querySelector("content\\:encoded")?.textContent || item.querySelector("description")?.textContent || "";
          if (content) {
            actualImageUrl = extractImageFromContent(content, title);
          }
        }
        
        // 6. Last Resort: Check enclosure URL if it looks like an image, even without a type
        if (!actualImageUrl) {
          const enclosure = item.querySelector("enclosure");
          if (enclosure && enclosure.getAttribute("url")) {
            const url = enclosure.getAttribute("url");
            if (/\.(jpg|jpeg|png|gif|webp)/i.test(url)) {
              actualImageUrl = url;
            }
          }
        }

        console.log(
          `🔍 Image extraction for "${title.substring(0, 30)}...": ${actualImageUrl ? `✅ Found: ${actualImageUrl.substring(0, 50)}...` : "❌ Not found"
          }`,
        )

        return {
          id: `${category}-${idx + 1}-${Date.now()}`,
          title: title,
          description:
            (item.querySelector("description") ? item.querySelector("description").textContent : "")
              .replace(/<[^>]*>/g, "")
              .substring(0, 200) + "...",
          link: item.querySelector("link") ? item.querySelector("link").textContent : "#",
          pubDate: item.querySelector("pubDate") ? item.querySelector("pubDate").textContent : new Date().toISOString(),
          author:
            (item.querySelector("dc\\:creator")?.textContent ||
             item.querySelector("creator")?.textContent ||
             item.querySelector("author")?.textContent) || "Unknown",
          thumbnail: categoryPlaceholder,
          actualImageUrl,
          imageLoaded: false,
          fetchTime: Date.now(),
        }
      })
    }

    console.log(`📊 Parsed ${items.length} FRESH items from ${category} RSS feed (limited to 10)`)
    console.log(`🖼️ Items with images: ${items.filter((item) => item.actualImageUrl).length}/${items.length}`)

    return items
  }

  // Direct image loading approach
  const loadImagesDirectly = useCallback(async (items, category) => {
    console.log(`🖼️ Starting direct image loading for ${items.length} items in ${category}`)

    // Filter items that have actual image URLs and haven't been loaded yet
    const itemsToLoad = items.filter((item) => item.actualImageUrl && !item.imageLoaded)
    console.log(`📸 Found ${itemsToLoad.length} items with unloaded images`)

    if (itemsToLoad.length === 0) {
      return
    }

    // Load images one by one with immediate UI updates
    for (const item of itemsToLoad) {
      if (currentDisplayCategoryRef.current !== category) {
        console.log(`⏹️ Stopping image loading - category changed from ${category}`)
        break
      }

      try {
        console.log(`🔄 Loading image for: ${item.title.substring(0, 30)}...`)

        // Test if image loads successfully
        const testImage = new Image()
        testImage.crossOrigin = "anonymous"

        const imageLoadPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Image load timeout"))
          }, 8000)

          testImage.onload = () => {
            clearTimeout(timeout)
            resolve(item.actualImageUrl)
          }

          testImage.onerror = () => {
            clearTimeout(timeout)
            reject(new Error("Image failed to load"))
          }

          testImage.src = item.actualImageUrl
        })

        try {
          await imageLoadPromise
          console.log(`✅ Image loaded successfully for: ${item.title.substring(0, 30)}...`)

          // Update the specific item in the news state immediately
          if (currentDisplayCategoryRef.current === category) {
            setNews((currentNews) =>
              currentNews.map((newsItem) =>
                newsItem.id === item.id ? { ...newsItem, thumbnail: item.actualImageUrl, imageLoaded: true } : newsItem,
              ),
            )
          }
        } catch (error) {
          console.log(`❌ Failed to load image for: ${item.title.substring(0, 30)}...`, error.message)
        }

        // Small delay between image loads to prevent overwhelming
        await new Promise((resolve) => setTimeout(resolve, 300))
      } catch (error) {
        console.error(`❌ Error processing image for ${item.title}:`, error)
      }
    }

    console.log(`🎉 Completed direct image loading for ${category}`)
  }, [])

  // FIXED: Always fetch fresh data, minimal caching
  const fetchNews = useCallback(
    async (category, forceRefresh = false, isBackgroundFetch = false) => {
      // CHANGED: Only use cache if it's very recent (less than 2 minutes) and not forced refresh
      if (!forceRefresh && isCacheValid(category) && newsCacheRef.current[category] && !isBackgroundFetch) {
        console.log(`⚡ Using recent cache for ${categories[category].name} (less than 2 minutes old)`)
        const cachedNews = newsCacheRef.current[category]

        setNews(cachedNews)
        setLoading(false)
        setError(null)
        setVisibleItems(Math.min(10, cachedNews.length))
        currentDisplayCategoryRef.current = category

        // Still load images for cached items
        loadImagesDirectly(cachedNews, category)
        return
      }

      if (fetchingRef.current.has(category)) {
        console.log(`⏳ Already fetching ${category}`)
        return
      }

      fetchingRef.current.add(category)

      // Show loading state
      if (!isBackgroundFetch) {
        setLoading(true)
        setError(null)
      }

      try {
        const RSS_FEED_URL = categories[category].url
        console.log(
          `🚀 Fetching FRESH data for ${categories[category].name} ${isBackgroundFetch ? "(background)" : ""}`,
        )

        const result = await fetchWithOptimizedProxy(RSS_FEED_URL)
        const allItems = parseRSSData(result, category)

        if (allItems.length === 0) {
          throw new Error("No news items found in the feed")
        }

        // Update caches with fresh data
        newsCacheRef.current[category] = allItems
        cacheTimestampsRef.current[category] = Date.now()

        // Update last fetch time
        setLastFetchTime((prev) => ({
          ...prev,
          [category]: Date.now(),
        }))

        console.log(
          `✅ Loaded ${allItems.length} FRESH items for ${categories[category].name} ${isBackgroundFetch ? "(background)" : ""}`,
        )

        // Update display state if this matches active category
        if (!isBackgroundFetch && category === activeCategory) {
          setNews(allItems)
          setLoading(false)
          setVisibleItems(Math.min(10, allItems.length))
          currentDisplayCategoryRef.current = category

          // Load images directly
          loadImagesDirectly(allItems, category)
        } else if (isBackgroundFetch) {
          console.log(`📦 Background fetch completed for ${category}, cached fresh data`)
        }
      } catch (err) {
        console.error("Error fetching fresh news:", err)

        if (!isBackgroundFetch) {
          setError(
            `Unable to load fresh ${categories[category].name} news. Please try refreshing or select a different category.`,
          )
          setLoading(false)
        }
      } finally {
        fetchingRef.current.delete(category)
      }
    },
    [categories, loadImagesDirectly, isCacheValid, activeCategory],
  )

  fetchNewsRef.current = fetchNews

  // REMOVED: Background preloading to ensure fresh data priority
  // No more background preloading - focus on current category freshness

  // FIXED: Always fetch fresh data on category/page load
  useEffect(() => {
    if (defaultPlaceholder) {
      console.log(`🔄 Loading FRESH data for ${activeCategory} category`)
      currentDisplayCategoryRef.current = activeCategory
      // Always force refresh to get latest data
      fetchNewsRef.current(activeCategory, true) // Force refresh = true
    }
  }, [activeCategory, defaultPlaceholder])

  // FIXED: Enhanced category change with forced refresh
  const handleCategoryChange = useCallback(
    (categoryKey) => {
      console.log(`🔄 Switching to ${categoryKey} with FRESH data`)

      setActiveCategory(categoryKey)
      setSearchTerm("")
      setVisibleItems(10)
      currentDisplayCategoryRef.current = categoryKey
      setLoading(true)

      // Always force refresh when changing categories to get latest news
      setTimeout(() => fetchNewsRef.current(categoryKey, true), 100) // Force refresh = true
    },
    [],
  )

  // ADDED: Auto-refresh mechanism every 5 minutes for current category
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      if (!loading && activeCategory && currentDisplayCategoryRef.current === activeCategory) {
        console.log(`🔄 Auto-refreshing ${activeCategory} for fresh news`)
        fetchNewsRef.current(activeCategory, true) // Force refresh
      }
    }, FORCE_REFRESH_INTERVAL)

    return () => clearInterval(autoRefreshInterval)
  }, [activeCategory, loading])

  // ADDED: Visibility change handler to refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeCategory) {
        console.log(`👁️ Tab became visible - refreshing ${activeCategory} for latest news`)
        fetchNewsRef.current(activeCategory, true) // Force refresh when tab becomes visible
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [activeCategory])

  // Progressive loading for large datasets
  const loadMoreItems = useCallback(() => {
    setVisibleItems((prev) => Math.min(prev + LOAD_INCREMENT, filteredNews.length))
  }, [])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleItems < filteredNews.length && !loading) {
          loadMoreItems()
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    )

    observerRef.current = observer
    return () => observer.disconnect()
  }, [visibleItems, loading, loadMoreItems])

  // Filter logic
  const searchTermLower = searchTerm.toLowerCase()
  const filteredNews = news.filter((article) => {
    return (
      article.title.toLowerCase().includes(searchTermLower) ||
      article.description.toLowerCase().includes(searchTermLower) ||
      article.author.toLowerCase().includes(searchTermLower)
    )
  })

  // Current visible news
  const currentNews = filteredNews.slice(0, visibleItems)

  // Reset visible items when search changes
  useEffect(() => {
    setVisibleItems(10)
  }, [searchTerm])

  const formatDate = (date) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))

  const handleNewsClick = (article) => {
    window.open(article.link, "_blank", "noopener,noreferrer")
  }

  // Simplified image error handling
  const handleImageError = (e, article) => {
    const currentSrc = e.currentTarget.src

    // Don't replace if it's already a placeholder
    if (currentSrc.startsWith("data:")) {
      return
    }

    console.log(`🖼️ Image failed in UI: ${currentSrc.substring(0, 50)}...`)

    // Fallback to placeholder
    e.currentTarget.src = generatePlaceholderImage(600, 400, activeCategory)
  }

  // Enhanced error UI
  if (error) {
    return (
      <div className="news-section">
        <div className="news-title">News Temporarily Unavailable</div>
        <div className="error-container">
          <p>{error}</p>
          <p className="error-subtitle">
            RSS feeds may have temporary restrictions. Try refreshing or select a different category.
          </p>
        </div>
        <div className="error-actions">
          <button className="news-search-btn" onClick={() => fetchNewsRef.current(activeCategory, true)}>
            🔄 Refresh Fresh Data
          </button>
          <button className="news-search-btn" onClick={() => handleCategoryChange("india")}>
            📰 Try India News
          </button>
        </div>
        <div className="error-categories">
          <p>Or try a different category:</p>
          <div className="category-tabs">
            <div className="category-tabs-container">
              {Object.entries(categories)
                .slice(0, 6)
                .map(([key, category]) => (
                  <button key={key} className="category-tab" onClick={() => handleCategoryChange(key)}>
                    {category.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="news-section">
      <h1 className="news-title">Latest News</h1>

      {/* Enhanced Category Tabs */}
      <div className="category-tabs">
        <div className="category-tabs-container">
          {Object.entries(categories).map(([key, category]) => (
            <button
              key={key}
              className={`category-tab ${activeCategory === key ? "active" : ""}`}
              onClick={() => handleCategoryChange(key)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Search */}
      <div className="news-search-bar">
        <input
          type="text"
          placeholder={`Search in ${categories[activeCategory].name} (${filteredNews.length} articles)...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="news-search-input"
        />
        <button className="news-search-btn" onClick={() => setSearchTerm("")}>
          Clear
        </button>
        <button className="news-search-btn" onClick={() => fetchNewsRef.current(activeCategory, true)}>
          🔄 Refresh
        </button>
      </div>

      {/* News Grid */}
      <div className="news-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-text">⚡ Loading FRESH {categories[activeCategory].name} news...</div>
            <div className="loading-subtitle">Fetching latest articles directly from RSS feed...</div>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="news-list-placeholder">
            <p>No news found in {categories[activeCategory].name}. Try a different search term.</p>
          </div>
        ) : (
          <>
            <div className="news-stats">
              Showing {currentNews.length} of {filteredNews.length} FRESH articles from{" "}
              {categories[activeCategory].name}
              {lastFetchTime[activeCategory] && (
                <span style={{ marginLeft: "10px", fontSize: "0.8rem", color: "#ccc" }}>
                  (Updated: {new Date(lastFetchTime[activeCategory]).toLocaleTimeString()})
                </span>
              )}
            </div>
            <div className="news-grid">
              {currentNews.map((article) => (
                <article key={article.id} className="news-card" onClick={() => handleNewsClick(article)}>
                  <div className="news-card-image-container">
                    <img
                      src={article.thumbnail || defaultPlaceholder}
                      alt={article.title}
                      className="news-card-img"
                      onError={(e) => handleImageError(e, article)}
                      loading="lazy"
                    />
                  </div>
                  <div className="news-card-content">
                    <div className="news-card-meta">
                      <span className="news-card-date">{formatDate(article.pubDate)}</span>
                      <span className="news-card-author">By {article.author}</span>
                    </div>
                    <h3 className="news-card-title">{article.title}</h3>
                    <p className="news-card-desc">{article.description}</p>
                    <div className="news-card-read-more">
                      <span className="read-more-indicator">Read Full Article →</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default NewsSection