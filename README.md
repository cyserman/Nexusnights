# NEXUS NIGHTS: The Intelligence Engine for STR Arbitrage

**Elite PropTech for the 0.1% of Short-Term Rental Investors.**

---

## I. THE INVESTOR PITCH: The Vision of NexusNights

In a saturated real-time market, alpha is found in the "Yield Gap"—the delta between a property's current under-performance and its optimized market potential. NexusNights is not a listing site; it is a **Tactical Command Center** designed to identify, analyze, and acquire high-yield Arbitrage Gems before they hit the mainstream radar.

By leveraging the **Nexus Intelligence Engine**, investors can pivot from "guessing" to "executing" with data-backed certainty. We transform raw, messy market data into high-yield investment opportunities using our proprietary scoring system.

---

## II. THE TECHNICAL WHITEPAPER: The Nexus Alpha Engine

### 1. The Core Logic
NexusNights operates on a multi-modal analysis pipeline powered by **Gemini 3.1 Pro**. The engine ingests scraped data from Airbnb, VRBO, and Zillow, segmenting large regions into neighborhood clusters to ensure 100% data coverage without rate-limit interference.

### 2. The Nexus Alpha Score (0-100)
Every property is assigned a proprietary score based on five key vectors:
*   **Yield Gap (40%)**: The primary driver. We calculate the difference between the property's current ADR (Average Daily Rate) and the top 5% of comparable listings in the same micro-neighborhood.
*   **Aesthetic Debt (20%)**: AI-driven analysis of listing photos and metadata. We identify properties with "good bones" but poor presentation—the ultimate arbitrage opportunity.
*   **Amenity Arbitrage (15%)**: Identification of missing "ROI Multipliers" (e.g., hot tubs, EV chargers, pet-friendly status) that the local market demands.
*   **Pricing Inefficiency (15%)**: Detection of listings with high occupancy but low ADR, signaling a massive opportunity for price optimization.
*   **Review Velocity (10%)**: Analysis of host engagement and guest sentiment to predict operational friction.

### 3. Agentic Workflow
The system utilizes an **Agentic Status Tracker** (inspired by Agent0) to provide full transparency into its logic. You can monitor neighborhood segmentation, data stream establishment, and cross-referencing in real-time.

---

## III. THE USER MANUAL: Operating the Command Center

### 1. Local Setup
*   **Requirements**:
    * **Node.js 18+** and **npm**
    * A valid **Gemini API key**
*   **Env configuration**:
    * Copy `.env.example` → `.env`
    * Set `GEMINI_API_KEY=your_real_key`
*   **Run the Command Center**:
    * `npm install`
    * `npm run dev`
    * Open `http://localhost:3000` in your browser

### 2. Initialization
*   **Access**: Enter the Elite Access Key (`NEXUS`) to initialize the engine.
*   **Scrubbing**: Enter a target region (e.g., "Miami, FL") and click **Scrub Region**. The engine will begin its neighborhood segmentation and data extraction.

### 3. Analysis & Refinement
*   **Nexus Notebook**: Use the scratchpad to add contextual filters (e.g., "Ski-in/Ski-out" or "Pet Friendly"). The engine incorporates these notes into its ranking logic.
*   **Alpha Weights**: Adjust the sliding scales on the right to prioritize different investment strategies. The Alpha Scores will re-calculate instantly.
*   **Knowledge Chat**: Click the **Knowledge Chat** button on any property card to interact with the property-specific knowledge base. Ask about ROI potential, market comps, or specific amenities.

### 4. Execution
*   **Investment Thesis**: Listen to the AI-generated thesis via the **TTS Engine** (Text-to-Speech) for a rapid auditory analysis.
*   **Contract Architect**: Click **Draft Contract** to generate a legally-sound acquisition agreement, complete with a "Value-Add Clause" and a "Seller Reality Check" designed to close the deal.

---

## IV. TECHNICAL SPECS & STACK
*   **Intelligence**: Gemini 3.1 Pro / Gemini 3 Flash (primary engine)
*   **Audio**: Gemini TTS (24kHz High-Fidelity)
*   **Frontend**: React 19 + Tailwind CSS + Lucide Icons
*   **State Management**: Real-time reactive hooks with LocalStorage persistence
*   **UI/UX**: High-intensity "PropTech Elite" aesthetic with custom Agent Status tracking

### Optional: Local Ollama Sidekick
*   **Role**: A companion agent for strategy help (search terms, neighborhood ideas, amenity multipliers). The main Nexus Alpha engine still runs on Gemini.
*   **Model options in the UI**:
    * `Tiny (Nexus Sidekick)` – small local model defined by `nexus-agent.json`
    * `llama3.1:8b`
    * `llama3.1:70b`
*   **How to enable**:
    * Install and run Ollama locally:
      * `export OLLAMA_ORIGINS="*"`
      * `ollama serve`
    * Make sure the selected model exists:
      * `ollama pull llama3.1:8b` (or `:70b`, or your own)
      * For the custom sidekick: `ollama create nexus-sidekick -f nexus-agent.json`
    * In the NexusNights header, toggle **Sidekick Bridge** on and pick a model.
*   **If Ollama is not running**:
    * The main scrub, map, Alpha weights, Notebook, TTS, and Contract Architect still work.
    * Only the Sidekick chat will show a helper message explaining how to start Ollama.

---

**NexusNights: Identify the Gap. Execute the Alpha.**
