# AnimeBeats Web Scraper

Un scraper sencillo para obtener openings y endings de anime desde MyAnimeList (MAL) y encontrar sus enlaces correspondientes en YouTube.

## Características

- Extrae información de canciones (título, artista, episodios) desde MyAnimeList.
- Busca automáticamente el video en YouTube priorizando canales oficiales (Crunchyroll, Netflix, etc.).
- Filtra por calidad (creditless, TV size, clean).
- Genera un archivo JSON compatible con MongoDB en la carpeta `data/`.

## Estructura de salida

Los datos se guardan en `data/anime_[ID].json` con el siguiente formato:

```json
{
  "anilist_id": 12345,
  "titulo_anime": "Nombre",
  "tipo_animacion": "anime_japones",
  "openings": [
    {
      "numero": 1,
      "titulo": "Song Title",
      "artista": "Artist",
      "episodios": "1-12",
      "enlace_youtube": "https://youtube.com/..."
    }
  ],
  "endings": [...]
}
```

## Dependencias principales

- `axios`: Para las peticiones HTTP.
- `cheerio`: Para el scraping de HTML.
- `yt-search`: Para buscar videos en YouTube.
