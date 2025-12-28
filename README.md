# Spotify Music Teacher

Learn to play any song with AI-generated sheet music, guitar tabs, and piano guides.

## Features

- **Spotify Integration**: Search for any song on Spotify
- **Automatic Transcription**: AI-powered audio-to-MIDI conversion using Basic-Pitch
- **Instrument Separation**: Separate drums, bass, vocals, and other instruments using Demucs
- **Sheet Music Generation**: Traditional notation rendered with VexFlow
- **Guitar Tabs**: Easy-to-read tablature with chord diagrams
- **Piano Guides**: Visual piano roll with hand positions and fingering suggestions
- **Skill Levels**: Beginner, intermediate, and advanced difficulty options
- **Learning Tips**: Instrument-specific practice guidance

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Demucs** - Meta's open-source audio source separation
- **Basic-Pitch** - Spotify's open-source audio-to-MIDI transcription
- **Spotipy** - Spotify API wrapper

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **VexFlow** - Music notation rendering
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional, for containerized deployment)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd SpotifyMusicTeacher

# Create environment file (optional - works without Spotify credentials)
cp backend/.env.example backend/.env
# Edit .env and add your Spotify credentials if you have them

# Start with Docker Compose
docker-compose up --build
```

Access the app at http://localhost:3000

### Option 2: Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your settings

# Run the server
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Access the app at http://localhost:3000

## Configuration

### Spotify API Credentials (Optional)

The app works without Spotify credentials using demo data. To enable full Spotify search:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Get your Client ID and Client Secret
4. Add them to `backend/.env`:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SPOTIFY_CLIENT_ID` | Spotify API client ID | (empty) |
| `SPOTIFY_CLIENT_SECRET` | Spotify API client secret | (empty) |
| `DEBUG` | Enable debug mode | `true` |
| `DEMUCS_MODEL` | Demucs model to use | `htdemucs` |

## How It Works

1. **Search**: Find a song using Spotify's search API
2. **Download**: Audio is downloaded from Spotify previews or YouTube
3. **Separate**: Demucs separates the audio into stems (drums, bass, vocals, other)
4. **Transcribe**: Basic-Pitch converts audio to MIDI/notes
5. **Generate**: Sheet music, tabs, and guides are generated from the notes
6. **Display**: VexFlow renders the sheet music in the browser

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search` | GET | Search for tracks |
| `/api/tracks/{id}` | GET | Get track details |
| `/api/process/{id}` | POST | Start processing a track |
| `/api/process/{id}/status` | GET | Check processing status |
| `/api/sheet-music/{id}` | GET | Get generated sheet music |
| `/api/stems/{id}` | GET | List available stems |

## Project Structure

```
SpotifyMusicTeacher/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── config.py        # Configuration
│   │   ├── spotify.py       # Spotify API integration
│   │   ├── audio_processor.py # Demucs stem separation
│   │   ├── transcriber.py   # Audio-to-MIDI transcription
│   │   └── sheet_generator.py # Sheet music generation
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── utils/           # Utilities and API
│   │   └── styles/          # CSS styles
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Known Limitations

- Audio transcription accuracy depends on song complexity
- Spotify previews are 30 seconds - full songs require YouTube download
- GPU recommended for faster Demucs processing
- Sheet music generation is simplified (rhythm may not be exact)

## Future Improvements

- Real-time audio playback synchronized with notation
- Interactive learning mode with progress tracking
- More instrument-specific guides (drums, bass, etc.)
- Chord detection and harmonic analysis
- PDF/MIDI export
- User accounts and saved songs

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Demucs](https://github.com/facebookresearch/demucs) by Meta
- [Basic-Pitch](https://github.com/spotify/basic-pitch) by Spotify
- [VexFlow](https://github.com/0xfe/vexflow) for music notation
- [Spotipy](https://github.com/spotipy-dev/spotipy) for Spotify API
